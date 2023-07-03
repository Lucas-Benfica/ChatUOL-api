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

	if(!name){
		return res.sendStatus(422)
	}

	//Validando se o name não está vazio com Joi
	const userSchema = joi.object({
		name: joi.string().required()
	})

	const validation = userSchema.validate(req.bory, { abortEarly: false })

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

			return res.sendStatus(201)
		}else{
			return res.status(409).send("Participante já cadastrado")
		}


	}catch (err){
		return res.status(500).send(err.message)
	}
})

app.get("/participants", async(req,res) => {
	const list = await db.collection("participants").find().toArray()
	return res.send(list)
})

app.post("/messages", async(req,res) => {
	const { to, text, type } = req.body
	const {user} = req.headers

	if(!to || !text){
		return res.sendStatus(422)
	}

	const messageSchema = joi.object({
		to: joi.string().required(),
		text: joi.string().required(),
		type: joi.string().required()
	})

	const validation = messageSchema.validate(req.bory, { abortEarly: false })

	if (validation.error) {
		const errors = validation.error.details.map(detail => detail.message)
		return res.status(422).send(errors)
	}
	
	const participant = await db.collection("participants").findOne({name: user})
	if(!participant){
		return res.status(422).send("Participante não encontrado")
	} 

	if(type != "message" && type != "private_message"){
		return res.status(422).send("Tipo da mensagem incorreto")
	}

	const message = {from: user, to, text, type, time: dayjs().format('HH:mm:ss')}

	try{
		await db.collection("messages").insertOne(message)
		return res.sendStatus(201)
	}catch (err){
		return res.status(500).send(err.message)
	}
})

app.get("/messages", async(req,res) => {
	const {user} = req.headers
	const {limit} = req.query

	const messages = await db.collection("messages").find({
		$or: [{from: user}, {to: user}, {to: "Todos"}, {to: "todos"}]
	}).toArray()

	if(limit){

		const limitSchema = joi.number().min(1)

		const validation = limitSchema.validate(limit)
		if (validation.error) {
			const errors = validation.error.details.map(detail => detail.message)
			return res.status(422).send(errors)
		}

		res.send(messages.slice( - limit ))

	}else{
		res.send(messages)
	}
})

app.post("/status", async(req,res) => {
	const {user} = req.headers
	if(!user){
		res.sendStatus(404)
	}
	try{
		const participant = await db.collection("participants").findOne({name: user})
		if(!participant){
			res.sendStatus(404)
		}else{
			await db.collection('participants').updateOne({id: new ObjectId(participant.id)}, {$set: {lastStatus:Date.now()}})
            return res.sendStatus(200)
		}
	}catch (err){
		return res.status(500).send(err.message)
	}
	
})

setInterval(async() => {
    try{
        const participants = await db.collection('participants').find({lastStatus: {$lt: Date.now() - 10000}}).toArray()

        participants.forEach(async p => {
			const {name, _id} = p
            const message = {
                from: name,
                to: 'Todos',
                text: 'sai da sala...',
                type: 'status',
                time: dayjs().format('HH:mm:ss')
            }

            db.collection('participants').deleteOne({_id: new ObjectId(_id)});
            db.collection('messages').insertOne(message);
        });
    }catch (err) {
        return res.status(500).send(err.message);
    }
}, 15000)