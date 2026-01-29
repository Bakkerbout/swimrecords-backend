import mongoose from "mongoose";

const recordSchema = new mongoose.Schema({
    stroke: {type: String, required: true},
    distance: {type: String, required: true},
    time: {type: String, required: true},
    name: {type: String, required: true},
    gender: {type: String, required: true},
    country: {type: String, required: true},
    imageUrl: {type: String, required: true},
    favorite: {type: Boolean, default: false},
}, {
    toJSON: {
        virtuals: true,
        versionKey: false,
        transform: (doc, ret) => {
            ret._links = {
                self: {
                    href: `${process.env.APPLICATION_URL}:${process.env.EXPRESS_PORT}/records/${ret.id}`,
                },
                collection: {
                    href: `${process.env.APPLICATION_URL}:${process.env.EXPRESS_PORT}/records`,
                },
            };

            delete ret._id;
        },
    },
});

const Record = mongoose.model('Record', recordSchema);

export default Record;