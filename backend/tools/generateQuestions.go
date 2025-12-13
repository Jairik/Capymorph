/* Helper function to populate the DB with morphology questions */

package main

import (
	"bufio"
	"context"
	"fmt"
	"math/rand"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
	"go.mongodb.org/mongo-driver/v2/mongo/readpref"
)

type Morpheme struct {
	Surface   string            `bson:"surface" json:"surface"`
	Role      string            `bson:"role" json:"role"` // root|affix
	Bound     bool              `bson:"bound" json:"bound"`
	MorphType string            `bson:"morph_type" json:"morph_type"` // inflectional|derivational
	Features  map[string]string `bson:"features" json:"features"`
}

type WordForm struct {
	Surface   string            `bson:"surface" json:"surface"`
	Base      string            `bson:"base" json:"base"`
	Category  string            `bson:"category" json:"category"` // noun|verb|adjective
	Features  map[string]string `bson:"features" json:"features"`
	Morphemes []Morpheme        `bson:"morphemes" json:"morphemes"`
}

// Document inserted into MongoDB
type QuestionDoc struct {
	ID         int      `bson:"id" json:"id"`
	Text       string   `bson:"text" json:"text"`
	Choices    []string `bson:"choices" json:"choices"`
	Answer     string   `bson:"answer" json:"answer"`
	Difficulty string   `bson:"difficulty" json:"difficulty"`

	QuestionText  string   `bson:"question_text" json:"question_text"`
	QuestionType  string   `bson:"question_type" json:"question_type"` // TF|MC
	CorrectAnswer string   `bson:"correct_answer" json:"correct_answer"`
	Distractors   []string `bson:"distractors,omitempty" json:"distractors,omitempty"`
	ViolatedRule  []string `bson:"violated_rule,omitempty" json:"violated_rule,omitempty"`
	BaseWord      string   `bson:"base_word" json:"base_word"`
	MorphemesUsed []string `bson:"morphemes_used" json:"morphemes_used"`
}

// Insert sample questions into the MongoDB collection
func main() {
	// Connect to MongoDB
	client, err := ConnectDB()
	if err != nil {
		fmt.Println("Failed to connect to MongoDB:", err)
		return
	}

	defer client.Disconnect(context.TODO())

	// Access the database and questions collection
	collection := client.Database("capymorphDB").Collection("questions")

	questions := generateSampleQuestions()
	if len(questions) == 0 {
		fmt.Println("No questions generated")
		return
	}

	res, err := collection.InsertMany(context.TODO(), questions, options.InsertMany().SetOrdered(false))
	if err != nil {
		fmt.Println("Failed to insert questions:", err)
		return
	}

	fmt.Printf("Inserted %d questions\n", len(res.InsertedIDs))
}

// Generate a list of sample questions
func generateSampleQuestions() []interface{} {
	rand.Seed(time.Now().UnixNano())

	bankPath := filepath.Join(filepath.Dir(os.Args[0]), "wordbank.txt")
	// When running via `go run`, os.Args[0] is a temp binary. Fall back to relative path.
	if _, err := os.Stat(bankPath); err != nil {
		bankPath = "wordbank.txt"
	}

	words, err := loadWordBank(bankPath)
	if err != nil {
		fmt.Println("Failed to read wordbank:", err)
		return nil
	}

	lex := newLexicon(words)
	gen := newMorphGenerator(lex)

	var docs []interface{}
	nextID := 1

	add := func(q QuestionDoc) {
		q.ID = nextID
		q.Text = q.QuestionText
		q.Answer = q.CorrectAnswer
		if q.QuestionType == "TF" {
			q.Choices = []string{"True", "False"}
		} else {
			q.Choices = append([]string{q.CorrectAnswer}, q.Distractors...)
			// Shuffle choices but keep correct_answer stable
			r := rand.New(rand.NewSource(time.Now().UnixNano()))
			r.Shuffle(len(q.Choices), func(i, j int) { q.Choices[i], q.Choices[j] = q.Choices[j], q.Choices[i] })
		}
		docs = append(docs, q)
		nextID++
	}

	// Generate a larger, balanced set.
	// 8 families * 32 each = 256+ questions (guarantees each family appears many times).
	const perFamily = 32
	const minTotal = 256

	irregularAdded := 0
	for i := 0; i < perFamily; i++ {
		add(gen.qMorphemeClassification())
		add(gen.qInflVsDeriv())
		add(gen.qLexCategoryChange())
		add(gen.qFeatureEncoding())
		add(gen.qMorphemeCounting())
		add(gen.qWellFormedness())
		add(gen.qAllomorphy())
		if q, ok := gen.qIrregularity(); ok {
			add(q)
			irregularAdded++
		}
	}

	// In the unlikely case the bank lacks irregular verbs, top up to ensure >250 total.
	for len(docs) < minTotal {
		add(gen.qInflVsDeriv())
	}

	_ = irregularAdded

	return docs
}

func loadWordBank(path string) ([]string, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	scanner := bufio.NewScanner(f)
	var out []string
	for scanner.Scan() {
		w := strings.TrimSpace(scanner.Text())
		if w == "" {
			continue
		}
		out = append(out, w)
	}
	if err := scanner.Err(); err != nil {
		return nil, err
	}
	return out, nil
}

type Lexicon struct {
	Words      []string
	Verbs      []string
	Nouns      []string
	Adjectives []string
	verbSet    map[string]bool
	adjSet     map[string]bool
}

func newLexicon(words []string) *Lexicon {
	verbSet := map[string]bool{}
	adjSet := map[string]bool{}

	verbs := []string{
		"walk", "run", "jump", "swim", "climb", "build", "break", "carry", "drive", "eat", "drink", "sleep", "think",
		"teach", "learn", "play", "work", "help", "move", "stop", "start", "open", "close", "watch", "listen", "talk",
		"call", "follow", "lead", "push", "pull", "catch", "throw", "cut", "grow", "fall", "rise", "win", "lose",
		"send", "receive", "graze", "forage", "float", "rest", "hide", "wander", "groom", "gather", "relax", "observe",
		"communicate", "signal", "escape", "approach", "avoid", "enter", "leave", "share", "protect", "adapt",
	}
	adjs := []string{
		"happy", "sad", "fast", "slow", "big", "small", "young", "old", "easy", "hard", "strong", "weak", "quiet", "loud",
		"bright", "dark", "clean", "dirty", "safe", "dangerous", "kind", "mean", "smart", "brave", "calm", "wild", "free",
		"busy", "ready", "tired", "social", "gentle", "alert", "noisy", "steady", "curious", "peaceful", "wet", "dry", "warm",
		"cool", "natural", "domestic", "aquatic", "terrestrial",
	}

	for _, v := range verbs {
		verbSet[v] = true
	}
	for _, a := range adjs {
		adjSet[a] = true
	}

	lex := &Lexicon{Words: words, verbSet: verbSet, adjSet: adjSet}
	for _, w := range words {
		if adjSet[w] {
			lex.Adjectives = append(lex.Adjectives, w)
		} else if verbSet[w] {
			lex.Verbs = append(lex.Verbs, w)
		} else {
			lex.Nouns = append(lex.Nouns, w)
		}
	}
	return lex
}

func (l *Lexicon) categoryOf(word string) string {
	if l.adjSet[word] {
		return "adjective"
	}
	if l.verbSet[word] {
		return "verb"
	}
	return "noun"
}

type MorphGenerator struct {
	lex *Lexicon

	irregularPast   map[string]string
	irregularPlural map[string]string
}

func newMorphGenerator(lex *Lexicon) *MorphGenerator {
	irrPast := map[string]string{
		"run":   "ran",
		"eat":   "ate",
		"drink": "drank",
		"sleep": "slept",
		"teach": "taught",
		"think": "thought",
	}
	irrPlural := map[string]string{
		"child": "children",
	}
	return &MorphGenerator{lex: lex, irregularPast: irrPast, irregularPlural: irrPlural}
}

func (g *MorphGenerator) baseForm(word string) WordForm {
	cat := g.lex.categoryOf(word)
	return WordForm{
		Surface:  word,
		Base:     word,
		Category: cat,
		Features: map[string]string{},
		Morphemes: []Morpheme{{
			Surface:   word,
			Role:      "root",
			Bound:     false,
			MorphType: "free",
			Features:  map[string]string{},
		}},
	}
}

func (g *MorphGenerator) pluralize(noun WordForm) WordForm {
	base := noun.Surface
	if irr, ok := g.irregularPlural[base]; ok {
		out := noun
		out.Surface = irr
		out.Features = map[string]string{"number": "plural"}
		out.Morphemes = append([]Morpheme{}, noun.Morphemes...)
		out.Morphemes = append(out.Morphemes, Morpheme{Surface: "PL", Role: "affix", Bound: true, MorphType: "inflectional", Features: map[string]string{"number": "plural", "allomorph": "irregular"}})
		return out
	}

	sfx := "s"
	if strings.HasSuffix(base, "s") || strings.HasSuffix(base, "x") || strings.HasSuffix(base, "z") || strings.HasSuffix(base, "ch") || strings.HasSuffix(base, "sh") {
		sfx = "es"
	} else if strings.HasSuffix(base, "y") && len(base) > 1 {
		prev := base[len(base)-2]
		if !strings.ContainsRune("aeiou", rune(prev)) {
			base = base[:len(base)-1] + "i"
			sfx = "es" // cities
		}
	}

	out := noun
	out.Surface = base + sfx
	out.Features = map[string]string{"number": "plural"}
	out.Morphemes = append([]Morpheme{}, noun.Morphemes...)
	out.Morphemes = append(out.Morphemes, Morpheme{Surface: sfx, Role: "affix", Bound: true, MorphType: "inflectional", Features: map[string]string{"number": "plural", "allomorph": sfx}})
	return out
}

func (g *MorphGenerator) pastTense(verb WordForm) WordForm {
	base := verb.Surface
	if irr, ok := g.irregularPast[base]; ok {
		out := verb
		out.Surface = irr
		out.Features = map[string]string{"tense": "past"}
		out.Morphemes = append([]Morpheme{}, verb.Morphemes...)
		out.Morphemes = append(out.Morphemes, Morpheme{Surface: "PST", Role: "affix", Bound: true, MorphType: "inflectional", Features: map[string]string{"tense": "past", "allomorph": "irregular"}})
		return out
	}

	sfx := "ed"
	stem := base
	if strings.HasSuffix(base, "e") {
		sfx = "d"
	} else if strings.HasSuffix(base, "y") && len(base) > 1 {
		prev := base[len(base)-2]
		if !strings.ContainsRune("aeiou", rune(prev)) {
			stem = base[:len(base)-1] + "i"
		}
	} else if len(base) >= 3 {
		// crude CVC doubling: stop -> stopped
		last := base[len(base)-1]
		mid := base[len(base)-2]
		prev := base[len(base)-3]
		if !strings.ContainsRune("aeiou", rune(last)) && strings.ContainsRune("aeiou", rune(mid)) && !strings.ContainsRune("aeiou", rune(prev)) {
			if !strings.ContainsRune("wxy", rune(last)) {
				stem = base + string(last)
			}
		}
	}

	out := verb
	out.Surface = stem + sfx
	out.Features = map[string]string{"tense": "past"}
	out.Morphemes = append([]Morpheme{}, verb.Morphemes...)
	out.Morphemes = append(out.Morphemes, Morpheme{Surface: sfx, Role: "affix", Bound: true, MorphType: "inflectional", Features: map[string]string{"tense": "past"}})
	return out
}

func (g *MorphGenerator) deriveER(verb WordForm) WordForm {
	stem := verb.Surface
	sfx := "er"
	if strings.HasSuffix(stem, "e") {
		sfx = "r"
	}
	out := verb
	out.Surface = stem + sfx
	out.Category = "noun"
	out.Features = map[string]string{"derived": "agent"}
	out.Morphemes = append([]Morpheme{}, verb.Morphemes...)
	out.Morphemes = append(out.Morphemes, Morpheme{Surface: sfx, Role: "affix", Bound: true, MorphType: "derivational", Features: map[string]string{"derivation": "verb->noun"}})
	return out
}

func (g *MorphGenerator) deriveNESS(adj WordForm) WordForm {
	stem := adj.Surface
	if strings.HasSuffix(stem, "y") && len(stem) > 1 {
		stem = stem[:len(stem)-1] + "i"
	}
	out := adj
	out.Surface = stem + "ness"
	out.Category = "noun"
	out.Features = map[string]string{"derived": "state"}
	out.Morphemes = append([]Morpheme{}, adj.Morphemes...)
	out.Morphemes = append(out.Morphemes, Morpheme{Surface: "ness", Role: "affix", Bound: true, MorphType: "derivational", Features: map[string]string{"derivation": "adj->noun"}})
	return out
}

func (g *MorphGenerator) morphemeSurfaces(w WordForm) []string {
	var m []string
	for _, mor := range w.Morphemes {
		m = append(m, mor.Surface)
	}
	return m
}

func (g *MorphGenerator) pickVerb() string { return g.lex.Verbs[rand.Intn(len(g.lex.Verbs))] }
func (g *MorphGenerator) pickNoun() string { return g.lex.Nouns[rand.Intn(len(g.lex.Nouns))] }
func (g *MorphGenerator) pickAdj() string  { return g.lex.Adjectives[rand.Intn(len(g.lex.Adjectives))] }

// --- Question families ---

func (g *MorphGenerator) qMorphemeClassification() QuestionDoc {
	// Ensure >=2 morphemes via derivation then optional inflection
	verb := g.baseForm(g.pickVerb())
	word := g.deriveER(verb)
	if rand.Intn(2) == 0 {
		word = g.pluralize(word)
	}

	// pick an affix morpheme
	var target Morpheme
	for i := len(word.Morphemes) - 1; i >= 0; i-- {
		if word.Morphemes[i].Role == "affix" {
			target = word.Morphemes[i]
			break
		}
	}

	props := []string{"bound", "free", "root", "affix", "derivational", "inflectional"}
	prop := props[rand.Intn(len(props))]

	trueVal := false
	switch prop {
	case "bound":
		trueVal = target.Bound
	case "free":
		trueVal = !target.Bound
	case "root":
		trueVal = target.Role == "root"
	case "affix":
		trueVal = target.Role == "affix"
	case "derivational":
		trueVal = target.MorphType == "derivational"
	case "inflectional":
		trueVal = target.MorphType == "inflectional"
	}

	makeFalse := rand.Intn(2) == 0
	correct := "True"
	violated := ""
	if makeFalse {
		// flip exactly one property
		trueVal = !trueVal
		correct = "False"
		violated = "flipped_morpheme_property"
	}

	stmt := fmt.Sprintf("True/False: In the word %q, the morpheme %q is %s.", word.Surface, target.Surface, prop)

	return QuestionDoc{
		Difficulty:    "easy",
		QuestionText:  stmt,
		QuestionType:  "TF",
		CorrectAnswer: correct,
		ViolatedRule:  []string{violated},
		BaseWord:      word.Base,
		MorphemesUsed: g.morphemeSurfaces(word),
	}
}

func (g *MorphGenerator) qInflVsDeriv() QuestionDoc {
	// One option: only inflectional
	noun := g.baseForm(g.pickNoun())
	correctW := g.pluralize(noun)

	// Distractors: must include derivational affix
	v1 := g.deriveER(g.baseForm(g.pickVerb()))
	v2 := g.deriveNESS(g.baseForm(g.pickAdj()))
	v3 := g.pluralize(g.deriveER(g.baseForm(g.pickVerb())))

	correctAnswer := correctW.Surface
	distractors := []string{v1.Surface, v2.Surface, v3.Surface}
	violated := []string{"contains_derivational_affix", "contains_derivational_affix", "contains_derivational_affix"}

	q := "Which word contains only inflectional morphology?"
	return QuestionDoc{
		Difficulty:    "medium",
		QuestionText:  q,
		QuestionType:  "MC",
		CorrectAnswer: correctAnswer,
		Distractors:   distractors,
		ViolatedRule:  violated,
		BaseWord:      correctW.Base,
		MorphemesUsed: g.morphemeSurfaces(correctW),
	}
}

func (g *MorphGenerator) qLexCategoryChange() QuestionDoc {
	adj := g.baseForm(g.pickAdj())
	derived := g.deriveNESS(adj)

	makeFalse := rand.Intn(2) == 0
	correct := "True"
	violated := ""
	if makeFalse {
		correct = "False"
		violated = "incorrect_category_change_claim"
	}

	stmt := fmt.Sprintf("True/False: Adding %q to %q changes its lexical category.", "-ness", adj.Surface)
	// True statement for -ness is category-changing; false flips that single claim.
	return QuestionDoc{
		Difficulty:    "easy",
		QuestionText:  stmt,
		QuestionType:  "TF",
		CorrectAnswer: correct,
		ViolatedRule:  []string{violated},
		BaseWord:      derived.Base,
		MorphemesUsed: g.morphemeSurfaces(derived),
	}
}

func (g *MorphGenerator) qFeatureEncoding() QuestionDoc {
	verb := g.baseForm(g.pickVerb())
	inflected := g.pastTense(verb)

	suffix := inflected.Morphemes[len(inflected.Morphemes)-1].Surface
	q := fmt.Sprintf("What grammatical feature does the suffix %q encode in %q?", suffix, inflected.Surface)

	correct := "tense: past"
	distractors := []string{"number: plural", "aspect: progressive", "person: 3"}
	violated := []string{"feature_mismatch", "feature_mismatch", "feature_mismatch"}

	return QuestionDoc{
		Difficulty:    "easy",
		QuestionText:  q,
		QuestionType:  "MC",
		CorrectAnswer: correct,
		Distractors:   distractors,
		ViolatedRule:  violated,
		BaseWord:      inflected.Base,
		MorphemesUsed: g.morphemeSurfaces(inflected),
	}
}

func (g *MorphGenerator) qMorphemeCounting() QuestionDoc {
	verb := g.baseForm(g.pickVerb())
	derived := g.deriveER(verb)
	word := g.pluralize(derived)

	count := len(word.Morphemes)
	q := fmt.Sprintf("How many morphemes are in %q?", word.Surface)
	correct := fmt.Sprintf("%d", count)
	distractors := []string{fmt.Sprintf("%d", count-1), fmt.Sprintf("%d", count+1), fmt.Sprintf("%d", count+2)}
	violated := []string{"wrong_morpheme_count", "wrong_morpheme_count", "wrong_morpheme_count"}

	return QuestionDoc{
		Difficulty:    "medium",
		QuestionText:  q,
		QuestionType:  "MC",
		CorrectAnswer: correct,
		Distractors:   distractors,
		ViolatedRule:  violated,
		BaseWord:      word.Base,
		MorphemesUsed: g.morphemeSurfaces(word),
	}
}

func (g *MorphGenerator) qWellFormedness() QuestionDoc {
	// One ill-formed word: -ness attached to a verb (violates selectional restriction)
	verb := g.baseForm(g.pickVerb())
	ill := WordForm{Surface: verb.Surface + "ness", Base: verb.Base, Category: "noun", Features: map[string]string{}, Morphemes: []Morpheme{
		{Surface: verb.Surface, Role: "root", Bound: false, MorphType: "free", Features: map[string]string{}},
		{Surface: "ness", Role: "affix", Bound: true, MorphType: "derivational", Features: map[string]string{"derivation": "adj->noun"}},
	}}

	// Well-formed distractors
	a1 := g.deriveNESS(g.baseForm(g.pickAdj()))
	a2 := g.deriveER(g.baseForm(g.pickVerb()))
	a3 := g.pluralize(g.baseForm(g.pickNoun()))

	q := "Which word is NOT well-formed (under the affix rules used in this quiz)?"
	correct := ill.Surface
	distractors := []string{a1.Surface, a2.Surface, a3.Surface}
	violated := []string{"", "", ""}

	return QuestionDoc{
		Difficulty:    "hard",
		QuestionText:  q,
		QuestionType:  "MC",
		CorrectAnswer: correct,
		Distractors:   distractors,
		ViolatedRule:  append([]string{"violates_-ness_selection"}, violated...),
		BaseWord:      ill.Base,
		MorphemesUsed: g.morphemeSurfaces(ill),
	}
}

func (g *MorphGenerator) qAllomorphy() QuestionDoc {
	// Ask specifically for the plural allomorph spelled "es"
	// Choose one noun that triggers -es
	var esBase string
	for {
		cand := g.pickNoun()
		if strings.HasSuffix(cand, "s") || strings.HasSuffix(cand, "x") || strings.HasSuffix(cand, "z") || strings.HasSuffix(cand, "ch") || strings.HasSuffix(cand, "sh") {
			esBase = cand
			break
		}
	}
	correctW := g.pluralize(g.baseForm(esBase))

	// Distractors: plural with -s (not -es)
	var d1, d2, d3 string
	for {
		cand := g.pickNoun()
		if cand == esBase {
			continue
		}
		p := g.pluralize(g.baseForm(cand))
		if strings.HasSuffix(p.Surface, "s") && !strings.HasSuffix(p.Surface, "es") {
			d1 = p.Surface
			break
		}
	}
	for {
		cand := g.pickNoun()
		p := g.pluralize(g.baseForm(cand))
		if p.Surface != d1 && strings.HasSuffix(p.Surface, "s") && !strings.HasSuffix(p.Surface, "es") {
			d2 = p.Surface
			break
		}
	}
	for {
		cand := g.pickNoun()
		p := g.pluralize(g.baseForm(cand))
		if p.Surface != d1 && p.Surface != d2 && strings.HasSuffix(p.Surface, "s") && !strings.HasSuffix(p.Surface, "es") {
			d3 = p.Surface
			break
		}
	}

	q := "Which word contains the plural allomorph spelled \"es\"?"
	return QuestionDoc{
		Difficulty:    "medium",
		QuestionText:  q,
		QuestionType:  "MC",
		CorrectAnswer: correctW.Surface,
		Distractors:   []string{d1, d2, d3},
		ViolatedRule:  []string{"uses_default_plural_-s", "uses_default_plural_-s", "uses_default_plural_-s"},
		BaseWord:      correctW.Base,
		MorphemesUsed: g.morphemeSurfaces(correctW),
	}
}

func (g *MorphGenerator) qIrregularity() (QuestionDoc, bool) {
	// Pick an irregular verb that exists in the bank
	var irrBases []string
	for b := range g.irregularPast {
		for _, w := range g.lex.Verbs {
			if w == b {
				irrBases = append(irrBases, b)
				break
			}
		}
	}
	if len(irrBases) == 0 {
		return QuestionDoc{}, false
	}
	base := irrBases[rand.Intn(len(irrBases))]
	correct := base

	// Distractors: regular verbs
	distractors := []string{}
	violated := []string{}
	for len(distractors) < 3 {
		cand := g.pickVerb()
		if cand == correct {
			continue
		}
		if _, ok := g.irregularPast[cand]; ok {
			continue
		}
		already := false
		for _, d := range distractors {
			if d == cand {
				already = true
				break
			}
		}
		if already {
			continue
		}
		distractors = append(distractors, cand)
		violated = append(violated, "regular_past_(-ed)")
	}

	q := "Which verb has an irregular past tense?"
	return QuestionDoc{
		Difficulty:    "hard",
		QuestionText:  q,
		QuestionType:  "MC",
		CorrectAnswer: correct,
		Distractors:   distractors,
		ViolatedRule:  violated,
		BaseWord:      correct,
		MorphemesUsed: []string{correct},
	}, true
}

// ConnectDB establishes a connection to MongoDB and returns the client.
// Kept in this file so `go run tools/generateQuestions.go` works when invoked directly.
func ConnectDB() (*mongo.Client, error) {
	// Support running from either `backend/` or `backend/tools/`
	if err := godotenv.Load(); err != nil {
		_ = godotenv.Load(filepath.Join("tools", ".env"))
	}

	uri := os.Getenv("MONGODB_URI")
	if uri == "" {
		return nil, fmt.Errorf("missing MONGODB_URI environment variable")
	}
	if strings.Contains(uri, "<db_password>") {
		return nil, fmt.Errorf("MONGODB_URI still contains <db_password>; replace it with the real password (URL-encode special characters)")
	}

	serverAPI := options.ServerAPI(options.ServerAPIVersion1)
	opts := options.Client().ApplyURI(uri).SetServerAPIOptions(serverAPI)

	client, err := mongo.Connect(opts)
	if err != nil {
		return nil, err
	}

	if err := client.Ping(context.TODO(), readpref.Primary()); err != nil {
		return nil, err
	}

	return client, nil
}
