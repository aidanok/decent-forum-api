import { and, equals } from '../lib/arql';
import { arweave } from '../lib/permaweb';


//{"op":"and","expr1":{"op":"equals","expr1":"App-Name","expr2":"arweave-id"},"expr2":{"op":"equals","expr1":"from","expr2":"uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M"}}


export async function queryArweaveId(address: string) {
  try { 
    const results = await arweave.arql(
      and(equals("App-Name", "arweave-id"), equals('from', address))
    )
    if (!results[0]) {
      return {
        handle: null,
      }
    }
    const tx = await arweave.transactions.get(results[0]);
    const handle = tx.get('data', { decode: true, string: true });
    return {
      handle
    }
  }
  catch (e){
    return {
      handle: null,
    }
  }
}