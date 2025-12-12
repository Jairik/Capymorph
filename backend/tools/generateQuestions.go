/* Helper function to populate the DB with morphology questions */

package main

import (
	"context"
	"fmt"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

// Structure of a question document in MongoDB
type Question struct {
	ID       int      `bson:"id" json:"id"`
	Text     string   `bson:"text" json:"text"`
	Choices  []string `bson:"choices" json:"choices"`
	Answer   string   `bson:"answer" json:"answer"`
	Difficulty string `bson:"difficulty" json:"difficulty"`
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

	// Sample questions to insert  
	// TODO

	Println("Success!")
}

// Generate a list of sample questions
func generateSampleQuestions() []interface{} {
	// TODO
}