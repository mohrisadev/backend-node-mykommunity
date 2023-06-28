import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import * as dotenv from 'dotenv';

dotenv.config();

import { PORT } from './env.js';
import routes from './core/rest.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('tiny'));

app.use('/api', routes);

app.listen(PORT, function () {
  console.log(`Running Rest API on Port: ${PORT}`);
});
