import axios from 'axios';

export const api = axios.create({
  baseURL: 'http://192.168.1.5:8000', // Replace with your backend IP if different
});
