//Set up the canvas 
const canvas = document.getElementById("gameCanvas");
const context = canvas.getContext("2d");

canvas.width = 2000;
canvas.height = 900; 

const playArea = {
    x: 20,
    y: 20,
    width: 800,
    height: 600
}; 

//important variables 
let loopId; //should stop game from speeding up everytime it resets

let score = 0;

let player; 
let shipImg; 
let enemyImg;

let enemyDirection = 1; //1 for right, -1 for left 
let enemySpeed = 2; 
let enemyDescension = 20; //how far they go down when they reach the edge of the box 

let enemies = []; 
let lasers = [];
let enemyLasers = [];
let isGameOver = false;
const keys = {}; 


//Event Emitter, handles all communication (Pub-Sub)
class EventEmitter{
    constructor(){
        this.listeners = {};
    }

    on(message, handler){
        if(!this.listeners[message]){
            this.listeners[message] = [];
        }
        this.listeners[message].push(handler);
    }

    emit(message, payload){
        if(this.listeners[message]){
            this.listeners[message].forEach(l => l(payload));
        }
    }
}

const eventemitter = new EventEmitter();

//listen for the 'monsterKilled' event to update score 
eventemitter.on('monsterKilled', () => {
    score += 10;
    if(score >= 500){handleWin();}
});

class Player{
    constructor(x,y,img){
        this.x = x;
        this.y = y;
        this.img = img; 
        this.width = 50;
        this.height = 50;
        this.speed = 7; //pixels moved per frame
    }

    draw(context){
        context.drawImage(this.img, this.x, this.y, this.width, this.height);
    }

    move(direction){
        if(direction == 'w' && this.y > playArea.height / 2) this.y -= this.speed; 
        if(direction == 's' && this.y + this.height < playArea.y + playArea.height - 20) this.y += this.speed; 
        if(direction == 'a' && this.x > playArea.x + 20) this.x -= this.speed; 
        if(direction == 'd' && this.x + this.width < playArea.x + playArea.width - 20) this.x += this.speed; 
    }
}

class Enemy{
    constructor(x,y,img){
        this.x = x; 
        this.y = y; 
        this.width = 40;
        this.height = 40;
        this.img = img; 
    }
    
    draw(context){
            context.drawImage(this.img, this.x, this.y, this.width, this.height);
    }

    travel(direction, speed){
        this.x += direction * speed;
    }
}

//refactor! use one class for player + enemy lasers
class Laser{
    constructor(x, y, color, speed, direction){
        this.x = x; 
        this.y = y; 
        this.width = 4;
        this.height = 15;
        this.color = color;
        this.speed = speed;
        this.direction = direction; //1 for down, -1 for up
    }

    draw(context){
        context.fillStyle = this.color;
        context.fillRect(this.x, this.y, this.width, this.height);
    }

    travel(){
        this.y += this.direction * this.speed;
    }
}

//Key Listeners

window.addEventListener('keydown', (e) => {  //user presses/holds key
    keys[e.key.toLowerCase()] = true;

    if(e.code == 'Space' && !isGameOver){ 
        const laserX = player.x + player.width / 2 - 2;
        const laserY = player.y; 
        lasers.push(new Laser(laserX, laserY, "red", 11, -1));
    }
});

window.addEventListener('keyup', (e) => { //user lets go of key
    keys[e.key.toLowerCase()] = false;
});


//show the playArea to the user by drawing black borders 
function drawBorders(){
    context.strokeStyle = "black"; 
    context.lineWidth = 5; 
    context.strokeRect(playArea.x, playArea.y, playArea.width, playArea.height);
}

//for bringing assets to the screen
function loadTexture(path){
    return new Promise((resolve) => {
        const img = new Image(); 
        img.src = path;
        img.onload = () => resolve(img); 
    });
}

function createEnemies(){
    const spacing = 60; 
    const startX = playArea.x + 20; 
    const startY = playArea.y + 20;

    for(let i = 0; i < 11; i++){
        enemies.push(new Enemy(startX + (i * spacing), startY, enemyImg));
    }
}

function checkCollisions(){
    //Player Lasers vs Enemies 
    lasers.forEach((l, lIndex) => {
        enemies.forEach((e, eIndex) => {
            if(
                l.x < e.x + e.width &&
                l.x + l.width > e.x && 
                l.y < e.y + e.height && 
                l.y + l.height > e.y
            ){
                enemies.splice(eIndex, 1);
                lasers.splice(lIndex, 1);

                //trigger 'monsterKilled'
                eventemitter.emit('monsterKilled');
            }
        });
    });

    //Enemy lasers vs Player 
    enemyLasers.forEach((el, elIndex) => {
        if(
            el.x < player.x + player.width && 
            el.x + el.width > player.x && 
            el.y < player.y + player.height && 
            el.y + el.height > player.y
        ) {handleGameOver();}
    });

    //Enemies collide with Player 
    enemies.forEach((e) => {
        if(
            e.x < player.x + player.width &&
            e.x + e.width > player.x &&
            e.y < player.y + player.height &&
            e.y + e.height > player.y
        ){handleGameOver();}
    });
}

function handleGameOver(){
    isGameOver = true; 
    cancelAnimationFrame(loopId);
    loopId = null;
    alert("GAME OVER! Invaders got you");
    resetGame();
}

function handleWin(){
    isGameOver = true; 
    cancelAnimationFrame(loopId); 
    loopId = null;
    alert("VICTORY! You reached 500 points");
    resetGame();
}

function resetGame(){
    isGameOver = true;
    if(loopId){
        cancelAnimationFrame(loopId); 
        loopId = null;
    }
    //reset values
    //isGameOver = false; 
    enemies = [];
    enemyLasers = [];
    lasers = [];
    enemyDirection = 1; //go back to beginning 
    score = 0;

    player = new Player(playArea.width / 2 - 25, playArea.y + playArea.height - 70, shipImg);
    
    //clear the race condition before making a new one
    setTimeout(() => {
        isGameOver = false; 
        createEnemies();
        gameLoop();
    }, 10);
}

async function setup(){
    shipImg = await loadTexture('assets/ship.png');
    enemyImg = await loadTexture('assets/enemy.png');
    resetGame();
}

//Game Loop 
function gameLoop(){
    if(isGameOver){
        loopId = null;
        return;
    }
    
    context.clearRect(0,0, canvas.width, canvas.height);
    drawBorders(); //draw the borders on screen 

    //move the player 
    if(keys['w']) player.move('w');
    if(keys['s']) player.move('s');
    if(keys['a']) player.move('a');
    if(keys['d']) player.move('d');
    player.draw(context); //draw the player 


    let hitWall = false;
    enemies.forEach(enemy => {
        enemy.travel(enemyDirection, enemySpeed); //enemies move 

        //if any enemy passes the player's baseline, game over 
        if(enemy.y + enemy.height >= playArea.y + playArea.height){handleGameOver();}

        //see if enemy hits the left/right walls of playArea 
        if(enemy.x + enemy.width >= playArea.x + playArea.width || enemy.x <= playArea.x) hitWall = true;
    });

    if(hitWall){
        enemyDirection *= -1; //go the other direction 
        enemies.forEach(enemy => {
            enemy.y += enemyDescension; //go downwards
        });
    }

    enemies.forEach(enemy => enemy.draw(context)); //draw the enemies

    //enemy firing lasers 
    if(enemies.length > 0 && Math.random() < 0.05){
        //pick a random enemy to shoot bullets 
        const randomShooter = enemies[Math.floor(Math.random() * enemies.length)];
        enemyLasers.push(new Laser(randomShooter.x + randomShooter.width/2, randomShooter.y + randomShooter.height, "purple", 5, 1));
    }

    //laser updates
    [lasers, enemyLasers].forEach(group => {
        group.forEach((l, i) => {
            l.travel();
            l.draw(context);
            if (l.y < playArea.y || l.y > playArea.y + playArea.height) group.splice(i, 1);
        });
    });

    checkCollisions(); //make sure enemies can be hit too 

    //keep spawning enemies until the player wins 
    if(enemies.length <= 0 && !isGameOver){createEnemies();}

    //show instructions to user 
    context.fillStyle = "black"; 
    context.font = "18px Comic Sans";
    context.fillText("Use WASD to move!", 900, 30); 

    context.fillStyle = "black"; 
    context.font = "18px Comic Sans";
    context.fillText("Use SPACE to shoot!", 900, 80); 
    
    context.fillStyle = "blue"; 
    context.font = "bold 24px";
    context.fillText(`Score: + ${score}`, 900, 130); 

    //progress bar for funsies 
    context.strokeStyle = "grey"; 
    context.strokeRect(900, 170, 200, 20); 
    context.fillStyle = "green"; 
    context.fillRect(900, 170, (score / 500) * 200, 20);

    loopId = requestAnimationFrame(gameLoop);
}

setup();
