import { createSeowonClient } from "../src/index";

const client = createSeowonClient();

console.log(client.resolveUrl("/").toString());
