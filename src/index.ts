import { config } from "dotenv";
import { fetchMembers } from "./etu";

config();

fetchMembers().then(console.log);
