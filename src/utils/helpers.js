

export async function compileProgram(client, programSource) {
    const text = await fetch(programSource).then(f => f.text())
    let encoder = new TextEncoder();
    let programBytes = encoder.encode(text);
    let compileResponse = await client.compile(programBytes).do();
    let compiledBytes = new Uint8Array(Buffer.from(compileResponse.result, "base64"));
    return compiledBytes;
}