import express from "express";
import Record from "../models/Record.js";
import querystring from "querystring";
import {isValidObjectId} from "mongoose";

const router = express.Router();

// CORS preflight for all items
router.options('/', (req, res) => {
    res.header('Allow', 'GET,POST,OPTIONS');
    res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin,Content-Type,Accept,Authorization');
    res.status(204).send();
});

// CORS preflight for id (GET, PUT, DELETE, PATCH)
router.options('/:id', (req, res) => {
    res.header('Allow', 'GET,PUT,DELETE,PATCH,OPTIONS');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,DELETE,PATCH,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin,Content-Type,Accept,Authorization');
    res.status(204).send();
});

// CORS preflight for favorite toggle
router.options('/:id/favorite', (req, res) => {
    res.header('Allow', 'PATCH,OPTIONS');
    res.header('Access-Control-Allow-Methods', 'PATCH,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin,Content-Type,Accept,Authorization');
    res.status(204).send();
});

// Get all
router.get('/', async (req, res) => {
    try {
        // Filtering
        const {stroke, distance, page: pageStr, limit: limitStr} = req.query;
        const mongoFilter = {};
        if (stroke) mongoFilter.stroke = stroke;
        if (distance) mongoFilter.distance = distance;

        // Pagination
        const page = parseInt(pageStr) || 1;
        const limit = limitStr ? parseInt(limitStr) : null;
        const totalItems = await Record.countDocuments(mongoFilter);

        let records;
        let totalPages = 1;

        if (limit) {
            const skip = (page - 1) * limit;
            records = await Record.find(mongoFilter).skip(skip).limit(limit);

            totalPages = Math.ceil(totalItems / limit) || 1;
        } else {
            records = await Record.find(mongoFilter);
        }

        const items = records.map(record => ({
            stroke: record.stroke,
            distance: record.distance,
            name: record.name,
            imageUrl: record.imageUrl,
            favorite: record.favorite,
            id: record.id,
            _links: {
                self: {
                    href: `${process.env.APPLICATION_URL}:${process.env.EXPRESS_PORT}/records/${record.id}`,
                }
            }
        }));

        // Links for self and collection
        const qsSelf = querystring.stringify(req.query);
        const selfLink = `${process.env.APPLICATION_URL}:${process.env.EXPRESS_PORT}/records${qsSelf ? '?' + qsSelf : ''}`;
        const buildPageLink = (p) => querystring.stringify({...req.query, page: p, limit});

        res.status(200).json({
            items,
            _links: {
                self: {href: selfLink},
                collection: {href: `${process.env.APPLICATION_URL}:${process.env.EXPRESS_PORT}/records`}
            },
            pagination: {
                currentPage: page,
                currentItems: items.length,
                totalPages,
                totalItems,
                _links: {
                    first: {
                        page: 1,
                        href: limit ? `${process.env.APPLICATION_URL}:${process.env.EXPRESS_PORT}/records?${buildPageLink(1)}` : selfLink
                    },
                    last: {
                        page: totalPages,
                        href: limit ? `${process.env.APPLICATION_URL}:${process.env.EXPRESS_PORT}/records?${buildPageLink(totalPages)}` : selfLink
                    },
                    previous: limit && page > 1 ? {
                        page: page - 1,
                        href: `${process.env.APPLICATION_URL}:${process.env.EXPRESS_PORT}/records?${buildPageLink(page - 1)}`
                    } : null,
                    next: limit && page < totalPages ? {
                        page: page + 1,
                        href: `${process.env.APPLICATION_URL}:${process.env.EXPRESS_PORT}/records?${buildPageLink(page + 1)}`
                    } : null
                }
            }
        });
    } catch (e) {
        res.status(500).json({error: e.message});
    }
});

// Get one :id
router.get('/:id', async (req, res) => {
    const {id} = req.params;

    if (!isValidObjectId(id)) {
        return res.status(404).json({error: "Record not found"});
    }

    try {
        const record = await Record.findById(id);
        if (!record) {
            return res.status(404).json({error: "Record not found"});
        }
        res.status(200).json(record);
    } catch (e) {
        res.status(500).json({error: "Server error"});
    }
});

// Create new item
router.post('/', async (req, res) => {
    const requiredFields = ['stroke', 'distance', 'time', 'name', 'gender', 'country', 'imageUrl'];

    for (let field of requiredFields) {
        if (
            req.body[field] === undefined ||
            typeof req.body[field] !== 'string' ||
            req.body[field].trim() === ''
        ) {
            return res.status(400).json({
                error: `Field '${field}' is required and must be not empty`
            });
        }
    }

    try {
        const record = await Record.create({
            stroke: req.body.stroke,
            distance: req.body.distance,
            time: req.body.time,
            name: req.body.name,
            gender: req.body.gender,
            country: req.body.country,
            imageUrl: req.body.imageUrl,
        });
        res.status(201).json(
            record
        );
    } catch (e) {
        res.status(400).json({error: e.message});
    }
});

// Delete item
router.delete('/:id', async (req, res) => {
    try {
        const result = await Record.deleteOne({_id: req.params.id});
        if (result.deletedCount === 0) {
            return res.status(404).json({message: "Record not found"});
        }
        res.status(204).send();
    } catch (e) {
        res.status(500).json({error: e.message});
    }
});

// Edit item
router.put('/:id', async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({error: "Empty request"});
        }

        const allowedFields = ['stroke', 'distance', 'time', 'name', 'gender', 'country', 'imageUrl'];
        const updateData = {};

        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                updateData[field] = req.body[field];
            }
        });

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({error: "No valid fields provided for update"});
        }

        const record = await Record.findByIdAndUpdate(
            req.params.id,
            updateData,
            {new: true, runValidators: true}
        );

        if (!record) {
            return res.status(404).json({error: "Record not found"});
        }

        res.status(200).json(record);

    } catch (e) {
        res.status(400).json({error: e.message});
    }
});

// PATCH for the frontend (button was not working, problem is /favorite)
router.patch("/:id/favorite", async (req, res) => {
    const {id} = req.params;

    if (!isValidObjectId(id)) {
        return res.status(404).json({message: "Record not found"});
    }

    try {
        const record = await Record.findById(id);
        if (!record) return res.status(404).json({message: "Record not found"});

        record.favorite = !record.favorite;
        await record.save();

        res.status(200).json(record);
    } catch (e) {
        res.status(500).json({error: e.message});
    }
});

// PATCH for the checker (did not go through checker with /favorite)
router.patch("/:id", async (req, res) => {
    const {id} = req.params;

    if (!isValidObjectId(id)) {
        return res.status(404).json({message: "Record not found"});
    }

    if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({error: "Empty request"});
    }

    const allowedFields = ['stroke', 'distance', 'time', 'name', 'gender', 'country', 'imageUrl', 'favorite'];
    const updateData = {};

    allowedFields.forEach(field => {
        const value = req.body[field];
        if (value !== undefined && !(typeof value === 'string' && value.trim() === '')) {
            updateData[field] = value;
        }
    });

    if (Object.keys(updateData).length === 0) {
        return res.status(400).json({error: "No valid fields provided for update"});
    }

    try {
        const record = await Record.findByIdAndUpdate(id, updateData, {
            new: true,
            runValidators: true,
        });

        if (!record) {
            return res.status(404).json({error: "Record not found"});
        }
        res.status(200).json(record);
    } catch (e) {
        res.status(400).json({error: e.message});
    }
});

export default router