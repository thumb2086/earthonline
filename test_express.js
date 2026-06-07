const express = require('express');
const app = express();
const apiRouter = express.Router();

apiRouter.post('/login', (req, res) => {
    res.json({ message: 'Login successful', region: req.params.region });
});

app.use('/api/:region', apiRouter);

app.listen(3002, () => console.log('Test server running on 3002'));
