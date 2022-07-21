function numeroRandom(cant) {
    //console.log(cant);
    let numerosFinales =[]
    for (let i = 0; i < cant; i++) {

        let numRandom = Math.floor((Math.random() * (1000 - 1)) + 1);
        numerosFinales.push(numRandom)

     }

     let numDuplicados = numerosFinales.sort()
     let arrayFinal = []
     let count = 0;
     for (let index = 0; index < numDuplicados.length; index++) {
         if(numDuplicados[index+1] === numDuplicados[index]){
             count++
            arrayFinal.push(`el numero ${numDuplicados[index]} se repite ${count} veces`)
         }
         
     }

    return arrayFinal;


}

process.on('message', msg => {
console.log(`cantidad: ${msg}`)
const numerosRandom = numeroRandom(msg)

process.send(JSON.stringify(numerosRandom))
process.exit()
})

process.send('listo')

module.exports = {numeroRandom}