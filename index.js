import express from "express";
import mongoose from "mongoose";
import recordsRouter from './routes/records.js';

try {
    const app = express();

    await mongoose.connect(`mongodb://127.0.0.1:27017/${process.env.DB_NAME}`, {
        serverSelectionTimeoutMS: 3000
    });

    // Middleware to support application/json Content-Type
    app.use(express.json());

    // Middleware to support application/x-www-form-urlencoded
    app.use(express.urlencoded({extended: true}));

    app.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');

        //     Block non Accept: application/json requests
        if (req.method !== 'OPTIONS' && !req.accepts('application/json')) {
            return res.status(406).json({
                error: 'Only JSON is allowed as Accept header'
            });
        }
        next();
    });

    // Content-Type must be JSON
    app.use((req, res, next) => {
        if (
            (req.method === 'POST' || req.method === 'PUT') &&
            !req.is('application/json')
        ) {
            return res.status(415).json({
                error: 'Content-Type must be application/json'
            });
        }
        next();
    });
    
    app.get("/", (req, res) => {
        res.json({message: 'Hello World!'});
    });

    app.use('/records', recordsRouter);

    app.listen(process.env.EXPRESS_PORT, () => {
        console.log(`Server is listening on port ${process.env.EXPRESS_PORT}`);
    });
} catch (e) {
    console.log(e);
}