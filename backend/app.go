/* Main backend - Hosts endpoints */

import "github.com/gin-gonic/gin"

var PORT string = ":8080";

func main() {
	r := gin.Default();

	// Health check endpoint
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status": "ok",
		})
	});

	// Start the server on port 8080
	r.Run(PORT);
}