import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

export const pool = mysql.createPool(
  process.env.DATABASE_URL || 'mysql://root:@localhost:3306/studysync'
);
