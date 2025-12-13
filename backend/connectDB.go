/* Helper to establish an initial connection to the DB */

package main

// Necessary modules
import (
	"context"
	"errors"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
	"go.mongodb.org/mongo-driver/v2/mongo/readpref"
)

// ConnectDB establishes a connection to MongoDB and returns the client
func ConnectDB() (*mongo.Client, error) {
	// Load .env file (supports running from backend/ or repo root)
	if err := godotenv.Load(); err != nil {
		_ = godotenv.Load("backend/.env")
	}

	uri := strings.TrimSpace(os.Getenv("MONGODB_URI"))
	if uri == "" {
		return nil, errors.New("MONGODB_URI is not set; add it to your environment or backend/.env")
	}
	if strings.Contains(uri, "<db_password>") {
		return nil, errors.New("MONGODB_URI still contains <db_password>; replace it with the real password (URL-encode special characters)")
	}

	// Set client options
	serverAPI := options.ServerAPI(options.ServerAPIVersion1)
	opts := options.Client().ApplyURI(uri).SetServerAPIOptions(serverAPI)

	// Create a new client and connect to the server
	client, err := mongo.Connect(opts)

	if err != nil {
		return nil, err
	}

	// Send a ping to confirm a successful connection
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := client.Ping(ctx, readpref.Primary()); err != nil {
		return nil, err
	}

	fmt.Println("Successfully connected to MongoDB!")
	return client, nil
}
