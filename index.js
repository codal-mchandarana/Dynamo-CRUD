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

const app = express();
const client = new DynamoDBClient({region: "eu-north-1"});
const docClient = DynamoDBDocumentClient.from(client, {
    marshallOptions: {
        removeUndefinedValues: true,
    }
});

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
        ExpressionAttributeNames:{
            "#id" : "id"
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

app.listen(3000, () => {
    console.log("PORT IS RUNNING ON PORT 3000")
})