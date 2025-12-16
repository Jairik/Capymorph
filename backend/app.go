/* Main backend - Hosts endpoints */

package main

import (
	"log"
	"net/http"
	"strconv"
	"strings"
	"sync/atomic"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

var PORT string = ":8080" // Constant server port for endpoints

func main() {

	var client atomic.Value  // Avoid race conditions on client access

	// Background Mongo connector with retry
	go func() {
		for {
			c, err := ConnectDB()
			if err != nil {
				log.Println("MongoDB not ready, retrying:", err)
				time.Sleep(5 * time.Second)  // Retry after 5 second delay
				continue
			}
			client.Store(c)
			log.Println("Successfully connected to MongoDB")
			return
		}
	}()

	// Initialize Gin router
	gin.SetMode(gin.ReleaseMode)
	r := gin.Default()
	r.SetTrustedProxies([]string{"127.0.0.1", "0.0.0.0"})

	// Declare api endpoints group
	api := r.Group("/api")

	// Health endpoint
	api.GET("/health", func(c *gin.Context) {
		if client.Load() == nil {
			c.JSON(503, gin.H{"status": "starting"})
			return
		}
		c.JSON(200, gin.H{"status": "ok"})
	})

	// Question retreival endpoint
	api.GET("/question", func(c *gin.Context) {
		// Retrieve question from DB
		val := client.Load()
		if val == nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "database not ready"})
			return
		}
		mongoClient := val.(*mongo.Client)

		question, err := GetRandomQuestion(mongoClient)
		// Return error if retrieval fails
		if err != nil {
			c.JSON(500, gin.H{"error": "Failed to retrieve question"})
			return
		}
		// Return question as JSON
		c.JSON(200, question)
	})

	// Retreive leaderboards endpoint
	api.GET("/leaderboards/:numPlayers", func(c *gin.Context) {
		// Pull numPlayers from URL param
		numPlayersStr := c.Param("numPlayers")
		numPlayers, err := strconv.Atoi(numPlayersStr)
		if err != nil || numPlayers <= 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "numPlayers must be a positive integer"})
			return
		}
		// Retrieve leaderboards from DB
		val := client.Load()
		if val == nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "database not ready"})
			return
		}
		mongoClient := val.(*mongo.Client)

		leaderboards, err := GetLeaderboards(mongoClient, numPlayers)
		// Return error if retrieval fails
		if err != nil {
			c.JSON(500, gin.H{"error": "Failed to retrieve leaderboards"})
			return
		}
		// Return leaderboards as JSON
		c.JSON(200, leaderboards)
	})

	// Add a score and name to the leaderboards endpoint
	api.POST("/addScoreLeaderboards", func(c *gin.Context) {
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

		val := client.Load()
		if val == nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "database not ready"})
			return
		}
		mongoClient := val.(*mongo.Client)

		rank, err := AddScoreToLeaderboards(mongoClient, req.Username, req.Score)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to insert score"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"rank": rank})
	})

	// Serve static files from the frontend build directory
	r.Static("/assets", "./frontend/dist")

	// Serve index.html for the root route
	r.NoRoute(func(c *gin.Context) {
		// Avoid caching index.html so new deploys don't break hashed module URLs.
		c.Header("Cache-Control", "no-store")
		c.File("./frontend/dist/index.html")
	})

	// Start the server on port 8080
	r.Run(PORT)
}
