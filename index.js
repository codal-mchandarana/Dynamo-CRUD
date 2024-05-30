import express from 'express'
import {DescribeTableCommand, DynamoDBClient, ListTablesCommand} from "@aws-sdk/client-dynamodb";
import {
    DeleteCommand,
    DynamoDBDocumentClient,
    GetCommand,
    PutCommand,
    ScanCommand,
    UpdateCommand
} from "@aws-sdk/lib-dynamodb";
import {configDotenv} from "dotenv";
configDotenv();

import {GetObjectCommand, PutObjectCommand, S3Client} from "@aws-sdk/client-s3";
import {getSignedUrl} from "@aws-sdk/s3-request-presigner";
import * as fs from "fs";

import { v4 as uuidv4 } from 'uuid';

const app = express();

const client = new DynamoDBClient({region: process.env.region});
const docClient = DynamoDBDocumentClient.from(client, {marshallOptions: {removeUndefinedValues: true,}});
const s3Client = new S3Client({region: process.env.region});

import multer from 'multer'
const upload = multer({ dest: 'uploads/' })

app.use(express.json());
app.use(express.urlencoded({extended: true}));

app.get('/', (req, res) => {
    res.send("Hello")
})

app.get('/connection', async (req, res) => {
    const command = new ListTablesCommand({});

    const response = await docClient.send(command);
    return res.status(200).json(response)
})

app.get('/data', async (req, res) => {
    const command = new DescribeTableCommand({
        TableName: "product",
    });

    const response = await docClient.send(command);
    return res.status(200).json(response)
})

app.get('/getDataById/:id', async (req, res) => {

    const id = parseInt(req.params.id);
    const command = new GetCommand({
        TableName: "product",
        Key: {id: id}
    });

    const response = await docClient.send(command);
    return res.status(200).json(response)
})

app.get('/getDataScan/:id', async (req, res) => {
    const id = parseInt(req.params.id);

    const command = new ScanCommand({
        TableName: "product",
        FilterExpression: "#id = :id",
        ExpressionAttributeNames: {
            "#id": "id"
        },
        ExpressionAttributeValues: {
            ":id": id
        },
    });

    const response = await docClient.send(command);
    return res.status(200).json(response)
})

app.get('/getAllData', async (req, res) => {
    const command = new ScanCommand({
        TableName: "product",
    });

    const response = await docClient.send(command);
    return res.status(200).json(response)
})

app.post('/addProduct', async (req, res) => {
    const {id, Brand, Description, Name} = req.body;

    const command = new PutCommand({
        TableName: "product",
        Item: {id, Brand, Description, Name}
    })

    const response = await docClient.send(command);
    return res.status(200).json(response)
})

app.put('/editProduct', async (req, res) => {
    const {id, key, value} = req.body;

    const command = new UpdateCommand({
        TableName: "product",
        Key: {
            id: id
        },
        UpdateExpression: `set #${key} = :value`,
        ExpressionAttributeNames: {
            [`#${key}`]: `${key}`
        },
        ExpressionAttributeValues: {
            ":value": value
        }
    })
    const response = await docClient.send(command);
    return res.status(200).json(response)
})

app.delete('/deleteProduct/:id', async (req, res) => {
    const id = parseInt(req.params.id);

    const command = new DeleteCommand({
        TableName: "product",
        Key: {
            id: id
        }
    });

    const response = await docClient.send(command);
    return res.status(200).json(response)
})

app.post('/fileUpload',upload.single('file'),async(req,res)=>{

    try{
        const fileName = req.file.originalname
        const filePath = `uploads/${req.file.filename}`;
        const fileStream = fs.createReadStream(filePath);

        let params = {
            Bucket:"fileuploader-demo",
            Key:`${fileName}`,
            Body:fileStream
        }

        let command = new PutObjectCommand(params);
        const data = await s3Client.send(command);

        const getObjectCommand = new GetObjectCommand({
            Bucket: 'fileuploader-demo',
            Key: `${fileName}`,
        });

        const preSignedUrl = await getSignedUrl(s3Client,getObjectCommand,{
            expiresIn:3600,
        });

        const result = {
            s3URI:`s3://fileuploader-demo/${fileName}`,
            preSignedUrl
        }

         const dynamoCommand = new PutCommand({
            TableName: "signUrl",
            Item: {id: uuidv4(),preSignedUrl}
        })

        const response = await docClient.send(dynamoCommand);

        return res.status(200).json({ preSignedURL: preSignedUrl});
    }catch (err) {
        return res.status(500).json({message: err.message});
    }
})

app.listen(3000, () => {
    console.log("PORT IS RUNNING ON PORT 3000")
})