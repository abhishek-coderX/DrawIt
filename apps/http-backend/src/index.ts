import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { JWT_SECRET } from '@repo/backend-common/config';
import { middleware } from "./middleware";
import { CreateUserSchema, SigninSchema, CreateRoomSchema } from "@repo/common/types";
import { prismaClient } from "@repo/db";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors());

process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception thrown:", err);
});

app.post("/signup", async (req, res) => {

    const parsedData = CreateUserSchema.safeParse(req.body);
    if (!parsedData.success) {
        console.log(parsedData.error);
        res.json({
            message: "Incorrect inputs"
        })
        return;
    }
    try {
        const hashedPassword = await bcrypt.hash(parsedData.data.password, 10);
        const user = await prismaClient.user.create({
            data: {
                email: parsedData.data?.username,
                password: hashedPassword,
                name: parsedData.data.name
            }
        })
        res.json({
            userId: user.id
        })
    } catch(e) {
        console.error("Signup error details:", e);
        res.status(411).json({
            message: "User already exists with this email"
        })
    }
})

app.post("/signin", async (req, res) => {
    const parsedData = SigninSchema.safeParse(req.body);
    if (!parsedData.success) {
        res.json({
            message: "Incorrect inputs"
        })
        return;
    }

    try {
        const user = await prismaClient.user.findFirst({
            where: {
                email: parsedData.data.username
            }
        })

        if (!user) {
            res.status(403).json({
                message: "Not authorized"
            })
            return;
        }

        const isValidPassword = await bcrypt.compare(parsedData.data.password, user.password);
        if (!isValidPassword) {
            res.status(403).json({
                message: "Not authorized"
            })
            return;
        }

        const token = jwt.sign({
            userId: user?.id
        }, JWT_SECRET);

        res.json({
            token
        })
    } catch(e) {
        console.error("Signin error:", e);
        res.status(500).json({
            message: "Internal server error"
        })
    }
})

app.post("/room", middleware, async (req, res) => {
    const parsedData = CreateRoomSchema.safeParse(req.body);
    if (!parsedData.success) {
        res.json({
            message: "Incorrect inputs"
        })
        return;
    }
    // @ts-ignore: TODO: Fix this
    const userId = req.userId;

    try {
        const normalizedSlug = parsedData.data.name.trim().toLowerCase().replace(/\s+/g, "-");
        const room = await prismaClient.room.create({
            data: {
                slug: normalizedSlug,
                adminId: userId
            }
        })

        res.json({
            roomId: room.id
        })
    } catch(e) {
        console.error("Room creation error:", e);
        res.status(411).json({
            message: "Room already exists with this name"
        })
    }
})

app.get("/chats/:roomId", async (req, res) => {
    try {
        const roomId = Number(req.params.roomId);
        const messages = await prismaClient.shape.findMany({
            where: {
                roomId: roomId
            }
        });

        res.json({
            messages
        })
    } catch(e) {
        console.log(e);
        res.json({
            messages: []
        })
    }
})

app.delete("/chats/:roomId", middleware, async (req, res) => {
    try {
        const roomId = Number(req.params.roomId);
        // @ts-ignore
        const userId = req.userId;

        // Fetch room to check admin creator permissions
        const room = await prismaClient.room.findFirst({
            where: {
                id: roomId
            }
        });

        if (!room) {
            res.status(404).json({
                message: "Room not found"
            });
            return;
        }

        if (room.adminId !== userId) {
            res.status(403).json({
                message: "Only the room creator can clear the canvas"
            });
            return;
        }

        await prismaClient.shape.deleteMany({
            where: {
                roomId: roomId
            }
        });
        res.json({
            message: "Canvas cleared successfully"
        })
    } catch(e) {
        console.log(e);
        res.status(500).json({
            message: "Failed to clear canvas"
        })
    }
})

app.get("/room/:slug", async (req, res) => {
    try {
        const slug = req.params.slug.trim().toLowerCase().replace(/\s+/g, "-");
        const room = await prismaClient.room.findFirst({
            where: {
                slug
            }
        });

        res.json({
            room
        })
    } catch(e) {
        console.error("Error fetching room slug:", e);
        res.status(500).json({
            message: "Failed to load room details"
        })
    }
})

app.get("/user/me", middleware, async (req, res) => {
    try {
        // @ts-ignore
        const userId = req.userId;
        const user = await prismaClient.user.findUnique({
            where: {
                id: userId
            },
            select: {
                id: true,
                email: true,
                name: true
            }
        });

        if (!user) {
            res.status(404).json({
                message: "User not found"
            });
            return;
        }

        res.json({
            user
        });
    } catch(e) {
        res.status(500).json({
            message: "Internal server error"
        });
    }
})

app.put("/room/:roomId", middleware, async (req, res) => {
    try {
        const roomId = Number(req.params.roomId);
        // @ts-ignore
        const userId = req.userId;
        const { name } = req.body;

        if (!name || name.trim().length < 3) {
            res.status(400).json({
                message: "Room name must be at least 3 characters"
            });
            return;
        }

        const room = await prismaClient.room.findFirst({
            where: { id: roomId }
        });

        if (!room) {
            res.status(404).json({
                message: "Room not found"
            });
            return;
        }

        if (room.adminId !== userId) {
            res.status(403).json({
                message: "Only the room creator can rename it"
            });
            return;
        }

        const updatedRoom = await prismaClient.room.update({
            where: { id: roomId },
            data: { slug: name.trim().toLowerCase().replace(/\s+/g, "-") }
        });

        res.json({
            message: "Room renamed successfully",
            room: updatedRoom
        });
    } catch (e) {
        console.error("Error renaming room:", e);
        res.status(411).json({
            message: "Room name already exists"
        });
    }
});

app.delete("/room/:roomId", middleware, async (req, res) => {
    try {
        const roomId = Number(req.params.roomId);
        // @ts-ignore
        const userId = req.userId;

        const room = await prismaClient.room.findFirst({
            where: { id: roomId }
        });

        if (!room) {
            res.status(404).json({
                message: "Room not found"
            });
            return;
        }

        if (room.adminId !== userId) {
            res.status(403).json({
                message: "Only the room creator can delete the room"
            });
            return;
        }

        // Delete dependencies first to avoid foreign key errors
        await prismaClient.shape.deleteMany({
            where: { roomId }
        });
        await prismaClient.chat.deleteMany({
            where: { roomId }
        });
        
        await prismaClient.room.delete({
            where: { id: roomId }
        });

        res.json({
            message: "Room deleted permanently"
        });
    } catch (e) {
        console.error("Error deleting room:", e);
        res.status(500).json({
            message: "Failed to delete room"
        });
    }
});

app.get("/rooms", middleware, async (req, res) => {
    try {
        // @ts-ignore
        const userId = req.userId;
        const rooms = await prismaClient.room.findMany({
            where: {
                adminId: userId
            },
            orderBy: {
                createdAt: "desc"
            }
        });

        res.json({
            rooms
        });
    } catch (e) {
        console.error("Error fetching rooms:", e);
        res.status(500).json({
            message: "Failed to fetch rooms"
        });
    }
});

app.listen(process.env.PORT ? Number(process.env.PORT) : 3001);