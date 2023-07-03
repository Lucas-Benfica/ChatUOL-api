import express from "express"
import cors from "cors"
import { MongoClient, ObjectId } from "mongodb"
import dotenv from "dotenv"
import joi from 'joi'
import dayjs from "dayjs"

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

const PORT = 5000
app.listen(PORT, () => console.log(`Servidor está rodando na porta ${PORT}`))


app.post("/participants", async(req, res) => {
    const { name } = req.body

	//Validando se o name não está vazio com Joi
	const userSchema = joi.object({
		name: joi.string().required()
	})

	const validation = userSchema.validate(req.bory)

	if (validation.error) {
		const errors = validation.error.details.map(detail => detail.message)
		return res.status(422).send(errors)
	}
	
	try{ 
		//buscar se tem algum participante com esse name
		const participant = await db.collection("participants").findOne({name: name})
		if(!participant){
			await db.collection("participants").insertOne({name, lastStatus: Date.now()})

			const message = { 
				from: name,
				to: 'Todos',
				text: 'entra na sala...',
				type: 'status',
				time: dayjs().format('HH:mm:ss')
			}

			await db.collection("messages").insertOne(message)

			res.sendStatus(201)
		}else{
			res.status(409).send("Participante já cadastrado")
		}


	}catch (err){
		res.status(500).send(err.message)
	}
})

app.get("/participants", async(req,res) => {
	const list = await db.collection("participants").find().toArray()
	return res.send(list)
})