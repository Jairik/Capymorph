/* Main backend - Hosts endpoints */

package main

import (
	"context"
	"log"
	"net/http"
	"strconv"
	"strings"

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
	r.GET("/api/question", func(c *gin.Context) {
		// Retrieve question from DB
		question, err := GetRandomQuestion(client)
		// Return error if retrieval fails
		if err != nil {
			c.JSON(500, gin.H{"error": "Failed to retrieve question"})
			return
		}
		// Return question as JSON
		c.JSON(200, question)
	})

	// Retreive leaderboards endpoint
	r.GET("/api/leaderboards/:numPlayers", func(c *gin.Context) {
		// Pull numPlayers from URL param
		numPlayersStr := c.Param("numPlayers")
		numPlayers, err := strconv.Atoi(numPlayersStr)
		if err != nil || numPlayers <= 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "numPlayers must be a positive integer"})
			return
		}
		// Retrieve leaderboards from DB
		leaderboards, err := GetLeaderboards(client, numPlayers)
		// Return error if retrieval fails
		if err != nil {
			c.JSON(500, gin.H{"error": "Failed to retrieve leaderboards"})
			return
		}
		// Return leaderboards as JSON
		c.JSON(200, leaderboards)
	})

	// Add a score and name to the leaderboards endpoint
	r.POST("/api/addScoreLeaderboards", func(c *gin.Context) {
		type addScoreRequest struct {
			Username string `json:"username"`
			Score    int    `json:"score"`
		}

		var req addScoreRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "expected JSON body with username (string) and score (int)"})
			return
		}

		req.Username = strings.TrimSpace(req.Username)
		if req.Username == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "username is required"})
			return
		}

		rank, err := AddScoreToLeaderboards(client, req.Username, req.Score)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to insert score"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"rank": rank})
	})

	// Start the server on port 8080
	r.Run(PORT)
}
