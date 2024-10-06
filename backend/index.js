import express, { text } from "express";
import cors from "cors";
import ImageKit from "imagekit"
import mongoose from "mongoose";
import UserChats from "./models/userChats.js";
import Chat from "./models/chat.js";
import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';

import dotenv from 'dotenv';
dotenv.config();

const port = process.env.PORT || 3000;
const app = express();


app.use(cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
}))

app.use(express.json())

const connect = async () => {
    try {
        await mongoose.connect(process.env.MONGO)
        console.log("Connected to MongoDB")
    } catch (error) {
        console.log(error)
    }
}

const imagekit = new ImageKit({
    urlEndpoint: process.env.IMAGE_KIT_ENDPOINT,
    publicKey: process.env.IMAGE_KIT_PUBLIC_KEY,
    privateKey: process.env.IMAGE_KIT_PRIVATE_KEY,
});

app.get("/api/upload", (req, res) => {
    const result = imagekit.getAuthenticationParameters();
    res.send(result);
    return
})

// ClerkExpressRequireAuth(), 

app.post("/api/chats", async (req, res) => {
        // const userId = req.auth.userId;
        const userId = "user_2mQWxEulrcNjoEvIq5qUbjuOu6N";
        const { text } = req.body;

    try {
        // CREATE A NEW CHAT
        const newChat = new Chat({
            userId: userId,
            history: [{ role: "user", parts: [{ text }] }],
        });

        const savedChat = await newChat.save();

        // CHECK IF THE USERCHATS EXISTS
        const userChats = await UserChats.find({ userId: userId });

        // IF DOESN'T EXIST CREATE A NEW ONE AND ADD THE CHAT IN THE CHATS ARRAY
        if (!userChats.length) {
            const newUserChats = new UserChats({
                userId: userId,
                chats: [
                    {
                        _id: savedChat._id,
                        title: text.substring(0, 40),
                    },
                ],
            });

            await newUserChats.save();
        } else {
            // IF EXISTS, PUSH THE CHAT TO THE EXISTING ARRAY
            await UserChats.updateOne(
                { userId: userId },
                {
                    $push: {
                        chats: {
                            _id: savedChat._id,
                            title: text.substring(0, 40),
                        },
                    },
                },
            );
            res.status(201).send(newChat._id);
        }
    } catch (err) {
        console.log(err);
        res.status(500).send("Error creating chat!");
    }
});

// ClerkExpressRequireAuth(), 
app.get("/api/userchats", async (req, res) => {
    // const userId = req.auth.userId;
    const userId = "user_2mQWxEulrcNjoEvIq5qUbjuOu6N";
    try {
        const userChats = await UserChats.find({ userId })
        let chats = [];
        if (userChats.length > 0) {
            chats = userChats[0].chats;
        }
        res.status(200).send(chats)
    } catch (err) {
        console.log(err)
        res.status(500).send("Error fetching userChats!")
    }
    return
})

// ClerkExpressRequireAuth(), 
app.get("/api/chats/:id", async (req, res) => {
        // const userId = req.auth.userId;
        const userId = "user_2mQWxEulrcNjoEvIq5qUbjuOu6N";
    try {
        
        if (req.params.id !== "dashboard") {
            const chat = await Chat.findOne({ _id: req.params.id, userId });
            if (chat) {
                res.status(200).send(chat);
            } else {
                res.status(200).send({});
            }
        }
        else {
           res.status(200).send({}); 
        }
       
        
    } catch (err) {
        console.log(err);
        res.status(500).send("Error fetching chat!");
    }
    return
});

// ClerkExpressRequireAuth(),
app.put("/api/chats/:id",  async (req, res) => {
       // const userId = req.auth.userId;
       const userId = "user_2mQWxEulrcNjoEvIq5qUbjuOu6N";
    const { question, answer, img } = req.body;

    const newItems = [
        ...(question
            ? [{ role: "user", parts: [{ text: question }], ...(img && { img }) }]
            : []),
        { role: "model", parts: [{  text: answer }] },
    ];

    try {
        const updatedChat = await Chat.updateOne(
            { _id: req.params.id, userId },
            {
                $push: {
                    history: {
                        $each: newItems,
                    },
                },
            }
        );
        res.status(200).send(updatedChat);
    } catch (err) {
        console.log(err);
        res.status(500).send("Error adding conversation!");
    }
});

app.use((err, req, res, next) => {
    console.error(err.stack)
    res.status(401).send('Unauthenticated!')
})


app.listen(port, () => {
    connect()
    console.log(`Server running on ${port}`)
});