/* Main backend - Hosts endpoints */

package main

import (
	"context"
	"log"

	"github.com/gin-gonic/gin"
)

var PORT string = ":8080" // Constant server port for endpoints

func main() {

	// Connect to MongoDB
	client, err := ConnectDB()
	if err != nil {
		log.Fatal("Failed to connect to MongoDB:", err)
	}
	defer client.Disconnect(context.TODO())

	// Initialize Gin router
	r := gin.Default()

	// Health check endpoint
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status": "ok",
		})
	})

	// Question retreival endpoint
	r.GET("/api/question/:qid", func(c *gin.Context)\ {
		// Pull out question ID from URL
		qid int = c.Param("qid")

		// Retrieve question from DB
		question, err := GetQuestionByID(client, qid)
		
		// Return error if retrieval fails
		if err != nil {
			c.JSON(500, gin.H{"error": "Failed to retrieve question"})
			return
		}

		// Return question as JSON
		c.JSON(200, question)
	})

	// Start the server on port 8080
	r.Run(PORT)
}