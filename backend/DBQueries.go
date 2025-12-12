/* Helper functions to execute DB queries */

package main

import (
	"context"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

// Question represents the structure of a question document in MongoDB
type Question struct {
	ID       int      `bson:"id" json:"id"`
	Text     string   `bson:"text" json:"text"`
	Choices  []string `bson:"choices" json:"choices"`
	Answer   string   `bson:"answer" json:"answer"`
	Difficulty string `bson:"difficulty" json:"difficulty"`
}