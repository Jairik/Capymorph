/* Helper functions to execute DB queries */

package main

import (
	"context"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

// Structure of a basic question document in MongoDB
type Question struct {
	ID         int      `bson:"id" json:"id"`
	Text       string   `bson:"text" json:"text"`
	Choices    []string `bson:"choices" json:"choices"`
	Answer     string   `bson:"answer" json:"answer"`
	Difficulty string   `bson:"difficulty" json:"difficulty"`
}

// Structure of a leaderboard entry
type LeaderboardEntry struct {
	Username string `bson:"username" json:"username"`
	Score    int    `bson:"score" json:"score"`
}

// Retrieves a random question from the MongoDB collection, returning a Question struct and error (if any)
func GetRandomQuestion(client *mongo.Client) (*Question, error) {
	// Access the database and questions collection
	collection := client.Database("capymorphDB").Collection("questions")

	// Define the aggregation pipeline to get a random document
	pipeline := mongo.Pipeline{
		{{Key: "$sample", Value: bson.D{{Key: "size", Value: 1}}}},
	}

	// Execute the aggregation
	cursor, err := collection.Aggregate(context.TODO(), pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.TODO())

	// Retrieve the random question
	var questions []Question
	if err := cursor.All(context.TODO(), &questions); err != nil {
		return nil, err
	}

	// Check if a question was found
	if len(questions) == 0 {
		return nil, mongo.ErrNoDocuments
	}

	return &questions[0], nil // Return the first (and only) question
}

// Retrieves the top N leaderboard entries from the MongoDB collection, returning a slice of LeaderboardEntry structs and error (if any)
func GetLeaderboards(client *mongo.Client, numPlayers int) ([]LeaderboardEntry, error) {
	// Access the database and leaderboards collection
	collection := client.Database("capymorphDB").Collection("leaderboards")

	// Define the find options to sort by score descending and limit results
	findOptions := options.Find()
	findOptions.SetSort(bson.D{{Key: "score", Value: -1}})
	findOptions.SetLimit(int64(numPlayers))

	// Execute the find query
	cursor, err := collection.Find(context.TODO(), bson.D{}, findOptions)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.TODO())

	// Retrieve the leaderboard entries
	var leaderboards []LeaderboardEntry
	if err := cursor.All(context.TODO(), &leaderboards); err != nil {
		return nil, err
	}

	// Return the leaderboard entries
	return leaderboards, nil
}
