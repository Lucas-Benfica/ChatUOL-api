import express from "express"
import cors from "cors"
import { MongoClient, ObjectId } from "mongodb"
import dotenv from "dotenv"

const app = express()

app.use(express.json())

app.use(cors())
app.use(express.json())
dotenv.config()

const mongoClient = new MongoClient(process.env.DATABASE_URL);

try {
	await mongoClient.connect()
	console.log("MongoDB conectado!")
} catch (err) {
	(err) => console.log(err.message)
}

const db = mongoClient.db()
console.log("HELLOOO")
