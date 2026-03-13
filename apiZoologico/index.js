/*use strict;

const http = require('http');

const server = http.createServer(function(req, res) {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bienvenido al Zoológico');
});

server.listen(5000);
*/

const express = require('express')
const app = express()
const port = 3000

app.get ('/prueba', function(req, res){
    res.send('Zoboomafoo')
})

app.listen(port, function(){
    console.log('La aplicacion se esta ejecutando por el puerto: '+ `${port}`)

})