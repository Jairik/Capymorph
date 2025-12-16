import "../App.css";
import { useEffect, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useGameStore } from "../store/gameStore";

type QuestionPayload = {
  ID: string;
  Text: string;
  Choices: string[];
  Answer: string;
  Difficulty: "easy" | "medium" | "hard" | string;
};

function normalizeQuestion(raw: any): QuestionPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const text = raw.Text ?? raw.text ?? raw.question ?? "";
  const choices = raw.Choices ?? raw.choices ?? raw.options ?? [];
  const answer = raw.Answer ?? raw.answer ?? raw.correct ?? "";
  const difficulty = raw.Difficulty ?? raw.difficulty ?? "";
  if (!text || !Array.isArray(choices) || choices.length === 0) return null;
  return {
    ID: (raw.ID ?? raw.id ?? "").toString(),
    Text: text,
    Choices: choices,
    Answer: answer,
    Difficulty: difficulty,
  };
}

export function QuestionModal() {
  const {
    isQuestionModalOpen,
    currentQuestion,
    questionModalCount,
    closeQuestionModal,
    incrementScore,
  } = useGameStore(
    useShallow((state) => ({
      isQuestionModalOpen: state.isQuestionModalOpen,
      currentQuestion: state.currentQuestion,
      questionModalCount: state.questionModalCount,
      closeQuestionModal: state.closeQuestionModal,
      incrementScore: state.incrementScore,
    }))
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<QuestionPayload | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [resolved, setResolved] = useState(false);

  const scoreByDifficulty: Record<string, number> = {
    easy: 5,
    medium: 15,
    hard: 30,
  };

  useEffect(() => {
    let isMounted = true;

    const fetchQuestion = async () => {
      setLoading(true);
      setError(null);
      setData(null);
      setSelectedIndex(null);
      setResolved(false);

      try {
        const res = await fetch("/api/question");
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        const body = await res.json();
        const normalized = normalizeQuestion(body);
        if (!normalized) throw new Error("Invalid question payload");
        if (isMounted) {
          setData(normalized as QuestionPayload);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to load question");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchQuestion();

    return () => {
      isMounted = false;
    };
  }, [questionModalCount]);

  const choices = useMemo(() => {
    if (data && Array.isArray(data.Choices)) return data.Choices;
    return [] as string[];
  }, [data]);

  const correctIndex = useMemo(() => {
    if (!data || !Array.isArray(data.Choices)) return -1;
    const idx = data.Choices.findIndex((c) => c === data.Answer);
    return idx >= 0 ? idx : -1;
  }, [data]);

  const handleChoice = (index: number) => {
    if (resolved || !data) return;
    setSelectedIndex(index);

    const isCorrect = index === correctIndex;
    if (isCorrect) {
      const award = scoreByDifficulty[data.Difficulty?.toLowerCase()] ?? 0;
      if (award > 0) {
        incrementScore(award);
      }
    }
    setResolved(true);
  };

  const handleClose = () => {
    closeQuestionModal();
    // Return focus to the canvas in case the modal hijacked it
    setTimeout(() => {
      const canvas = document.querySelector("canvas");
      if (canvas) {
        (canvas as HTMLCanvasElement).focus();
      }
    }, 50);
  };

  const statusMessage = useMemo(() => {
    if (!resolved || !data || selectedIndex === null) return null;
    if (selectedIndex === correctIndex) return "Correct!";
    const correctText = correctIndex >= 0 ? choices[correctIndex] : data.Answer;
    return `Nice try. Correct answer: ${correctText}`;
  }, [resolved, data, selectedIndex, correctIndex, choices]);

  if (!isQuestionModalOpen || !currentQuestion) {
    return null;
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content question-modal">
        <div className="modal-header">
          <h2>Snack Break!</h2>
        </div>
        <div className="modal-body">
          <p className="modal-note">Question {questionModalCount}.</p>
          {loading && <p>Loading question...</p>}
          {error && <p className="modal-error">{error}</p>}
          {data && choices.length > 0 && (
            <div className="question-block">
              <p className="question-text">{data.Text}</p>
              <p className="modal-note">Difficulty: {data.Difficulty}</p>
              <div className="choices">
                {choices.map((choice, idx) => {
                  const isSelected = idx === selectedIndex;
                  const isCorrect = resolved && idx === correctIndex;
                  const isWrong = resolved && isSelected && idx !== correctIndex;
                  const btnClass = [
                    "choice-button",
                    isSelected ? "selected" : "",
                    isCorrect ? "correct" : "",
                    isWrong ? "wrong" : "",
                  ]
                    .filter(Boolean)
                    .join(" ");
                  return (
                    <button
                      key={idx}
                      className={btnClass}
                      onClick={() => handleChoice(idx)}
                      disabled={resolved}
                    >
                      {choice}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {statusMessage && <p className="modal-status">{statusMessage}</p>}
          {resolved && <p className="modal-note">Continue rescuing baby Morphy!</p>}
        </div>
        <div className="modal-footer">
          {resolved && (
            <button onClick={handleClose} className="btn btn-modal-close disabled">
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
