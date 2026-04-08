import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5651/api",
});

export default api;
