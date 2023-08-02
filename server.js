import express from "express"
import "dotenv/config"

const app = express()
const PORT = process.env.PORT || 5000

app.get("/", (req, res) => {
    res.send("Hello, World!")
})

app.listen(PORT, () => console.log(`server running at http://localhost:${PORT}`))