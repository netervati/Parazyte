class Game{
    constructor(){
        this._gamewidth = 0;
        this._gameheight = 0;
        this.settings = {
            showGrid: false
        }
        this.assetJSON = {
            fungi: [],
            background: [
                { file: 'topframe' }
            ]
        }
        this.wavesJSON = {}
        this.assetIMG = {
            fungi: [],
            background: [],
            bugs: [],
            objects: []
        }
        this.assetAudio = {
            sfx: [],
            bgm: []
        }
        this.globalVariables = {
            player: {
                mana: 0,
                manaIndicator: 0,
                countSymbiote: 0,
                hp: 3,
                /** Symbiote: 20, Weccan: 25, Doomer: 40 */
                manaRequirement: [20,25,40]
            },
            waves: {
                intervalPointer: 0,
                interval: 300,
                loadWave: false,
                curWave: 1,
                curSquad: 0
            },
            enemyActiveLanes: {
                1:0,2:0,3:0,4:0,5:0,6:0,7:0,8:0
            },
            playerActiveLanes: {
                1:0,2:0,3:0,4:0,5:0,6:0,7:0,8:0
            }
        }
        this.globalEvents = {
            useAssets: false,
            assetsReady: false,
            startPlaying: false,
            mousePress: false,
            gameOver: false,
            gameWin: false,
            HUDhighlight: 0
        }
        this.gameObjects = {
            fungi: [],
            bugs: [],
            bullets: [],
        }
    }
    setStage(){
        let canvas = document.createElement('canvas');
        /** 
            Tile size: 64
            Width: 64 * 12
            Height: 64 * 9
        */
        canvas.width = this._gamewidth = 768;
        canvas.height = this._gameheight =  576;
        canvas.style.cssText = "background-color: black; border: 3px solid white;";
        this.ctx = canvas.getContext('2d');
        document.getElementById('box').innerHTML = "";
        document.getElementById('box').appendChild(canvas);
        this._canvasSelector = document.querySelector('canvas');
        this._canvasSelector.addEventListener('mousedown', function(e){
            getCursorPosition(this,e)
        });
        this.assetAudio.bgm[0].play();
        requestAnimationFrame(processor);
    }
    async createApp(){
        let fungidata = await fetch('assets/asset.json').then(response => response.json()).catch(error => console.log(error));
        this.assetJSON = fungidata;
        let wavesdata = await fetch('assets/waves.json').then(response => response.json()).catch(error => console.log(error));
        this.wavesJSON = wavesdata;
        let sprites = ['fungi','background','bugs','objects','sfx','bgm'];
        this.loaderFiles(0,0,sprites);
    }
    async loaderFiles(cursor, subcursor, sprites){
        if (cursor < sprites.length){
            if (subcursor < this.assetJSON[sprites[cursor]].length ){
                let pointer = this.assetJSON[sprites[cursor]][subcursor].file;
                if (cursor < 4){
                    let img = await addImageProcess(`assets/img/${pointer}.png`)
                    this.assetIMG[sprites[cursor]].push(img)
                }
                else{
                    let checkBgm = sprites[cursor] == "bgm" ? this.assetJSON[sprites[cursor]][subcursor].loop : false;
                    this.assetAudio[sprites[cursor]].push(new Howl({ src: [`assets/audio/${pointer}`], loop: checkBgm }),)
                }
                subcursor ++;
            }
            else{
                subcursor = 0;
                cursor ++;
            }
            this.loaderFiles(cursor, subcursor, sprites);
            return
        }
        else{
            this.globalEvents.assetsReady = true;
            let gameOverMessage = document.createElement('p');
            gameOverMessage.innerHTML = "PRESS ENTER TO START THE GAME";
            gameOverMessage.style.color = "white";
            document.getElementById("box").innerHTML = "";
            document.getElementById("box").appendChild(gameOverMessage);
        }
        this.globalEvents.useAssets = true;
    }
    addFungi(x,y){
        const mainX = x * 64;
        const mainY = y * 64;
        const tileCheck = this.gameObjects.fungi.find( ({ x, y }) => x === mainX && y === mainY );

        if (tileCheck) return this.globalEvents.mousePress = false;
        if (y == 0) return this.globalEvents.mousePress = false;
        let selectedAsset = this.globalEvents.HUDhighlight;
        let manaRequirement = this.globalVariables.player.manaRequirement
        if (this.globalVariables.player.mana > manaRequirement[selectedAsset]){
            this.gameObjects.fungi.push({
                assetIndex: selectedAsset,
                draw: true,
                x: mainX ,
                y: mainY,
                frameX: 0,
                frameY: 0,
                reverseIdle: 0,
                attackPointer: this.assetJSON.fungi[selectedAsset].attack.attackInterval,
                hp: this.assetJSON.fungi[selectedAsset].hp
            });
            if (selectedAsset == 0) this.globalVariables.player.countSymbiote ++;
            this.globalVariables.player.mana -= manaRequirement[selectedAsset];
            this.globalVariables.playerActiveLanes[mainY / 64] ++;
        }
        APPGAME.globalEvents.mousePress = false;
    }
    removeFungi(x,y){
        const mainX = x * 64;
        const mainY = y * 64;

        let nonRemoved = [];
        for (let x of this.gameObjects.fungi){
            if (x.x != mainX || x.y != mainY){
                nonRemoved.push(x);
            }
            else{
                this.globalVariables.playerActiveLanes[x.y/64] --;
            }
        }
        this.gameObjects.fungi = nonRemoved;
        APPGAME.globalEvents.mousePress = false;
    }
    async update(){
        let gameObjects = this.gameObjects;
        let assetJSON = this.assetJSON;
        let globalVariables = this.globalVariables;

        if (this.globalEvents.useAssets == true){
            for (let x of gameObjects.fungi){
                if (x.reverseIdle == 0){
                    x.frameX++;
                    if (x.frameX >= assetJSON.fungi[x.assetIndex].idle.frames - 1 ) x.reverseIdle = 1;
                }
                else{
                    x.frameX--;
                    if (x.frameX <= 0 ) x.reverseIdle = 0;
                }
            }
        }  
        
        if (globalVariables.player.mana < 100){
            globalVariables.player.manaIndicator ++;
            if (globalVariables.player.manaIndicator > 10){
                let manaBonus = this.globalVariables.player.countSymbiote;
                let manaCalculate = globalVariables.player.mana + 1 + manaBonus;
                if (manaCalculate > 100) manaCalculate = 100;
                globalVariables.player.mana = manaCalculate;
                globalVariables.player.manaIndicator = 0;
            }
        }

        /** WAVE HANDLER */
        if (globalVariables.waves.loadWave == false){
            globalVariables.waves.intervalPointer++;
            if (globalVariables.waves.intervalPointer == globalVariables.waves.interval) {
                globalVariables.waves.loadWave = true;
                console.log("NEW WAVE");
            }
        }
        else{
            if (this.wavesJSON.hasOwnProperty(globalVariables.waves.curWave)) {
                let bugs = this.wavesJSON[globalVariables.waves.curWave].bugs;
                if (globalVariables.waves.curSquad < bugs.length){
                    if (bugs[globalVariables.waves.curSquad].loader <  bugs[globalVariables.waves.curSquad].interval){
                        bugs[globalVariables.waves.curSquad].loader++;
                    }
                    else{
                        let bugStats = [
                            {hp: 6, speed: 2, dmg: 0.5, phase:false},
                            {hp: 6, speed: 4, dmg: 0.5, phase:true},
                            {hp: 10, speed: 1, dmg: 1, phase:false}
                        ]
                        this.gameObjects.bugs.push({
                            type: bugs[globalVariables.waves.curSquad].type,
                            x: bugs[globalVariables.waves.curSquad].x * 64,
                            y: bugs[globalVariables.waves.curSquad].y * 64,
                            draw: true,
                            frameX: 0,
                            frameY: 0,
                            reverseIdle: 0,
                            attacking: false,
                            hp: bugStats[bugs[globalVariables.waves.curSquad].type].hp,
                            dmg: bugStats[bugs[globalVariables.waves.curSquad].type].dmg,
                            speed: bugStats[bugs[globalVariables.waves.curSquad].type].speed,
                            phase: bugStats[bugs[globalVariables.waves.curSquad].type].phase
                        });
                        this.globalVariables.enemyActiveLanes[bugs[globalVariables.waves.curSquad].y] ++;
                        globalVariables.waves.curSquad++;
                    }
                }
                else{
                    globalVariables.waves.curSquad = 0;
                    globalVariables.waves.intervalPointer = 0;
                    globalVariables.waves.loadWave = false;
                    globalVariables.waves.curWave ++;
                }
            }
            else{
                this.globalEvents.gameWin = true;
            }
        }
        /** */

        /** ENEMY AI HANDLER */
        if (this.gameObjects.bugs.length > 0){
            let bugInZone = [];
            for (let x of this.gameObjects.bugs){
                if (x.draw == true){
                    if (x.reverseIdle == 0){
                        x.frameX++;
                        if (x.frameX >= assetJSON.bugs[0].frames - 1 ) x.reverseIdle = 1;
                    }
                    else{
                        x.frameX--;
                        if (x.frameX <= 0 ) x.reverseIdle = 0;
                    }
                    if (x.attacking == false){
                        x.x -= x.speed;
                    }
                    if (x.x >= 0){
                        bugInZone.push(x);
                    }
                    else{
                        this.globalVariables.enemyActiveLanes[x.y / 64] --;
                        if (this.globalVariables.player.hp > 0){
                            this.globalVariables.player.hp--;
                            x.draw = false;
                            console.log(x.y / 64, x.type);
                            console.log(this.gameObjects.bugs)
                        }
                    }
                }
            }
            this.gameObjects.bugs = bugInZone;
        }
        /** */

        /** PLAYER AI HANDLER */
        for (let [key, value] of Object.entries(this.globalVariables.playerActiveLanes)) {
            /** Check if fungi is laned with bug */
            if (value > 0){
                if (this.globalVariables.enemyActiveLanes[key] > 0){
                    let attackingFungi = this.gameObjects.fungi.filter(fungi => {
                        if (fungi.y / 64 == key && fungi.assetIndex > 0) return true;
                    })
                    for (let x of attackingFungi){
                        x.attackPointer++;
                        if (x.attackPointer >= this.assetJSON.fungi[x.assetIndex].attack.attackInterval){
                            x.attackPointer = 0;
                            this.gameObjects.bullets.push({
                                dmg: this.assetJSON.fungi[x.assetIndex].attack.dmg,
                                slow: this.assetJSON.fungi[x.assetIndex].attack.slow,
                                speed: this.assetJSON.fungi[x.assetIndex].attack.speed,
                                radius: this.assetJSON.fungi[x.assetIndex].attack.radius,
                                color: this.assetJSON.fungi[x.assetIndex].attack.color,
                                reverseMax: this.assetJSON.fungi[x.assetIndex].attack.reverseMax,
                                x: x.x, y: x.y, reverseSize: false, reverseCount: 0
                            });
                            this.assetAudio.sfx[x.assetIndex - 1].play();
                        }
                    }
                }
            }
        }
        /** */

        /** BULLET HANDLER */
        let bulletInZone = []
        for (let x of this.gameObjects.bullets){
            if (x.reverseSize == false){
                x.radius -= 0.5 ;
            }
            else{
                x.radius += 0.5;
            }
            x.reverseCount ++;
            if (x.reverseCount == x.reverseMax){
                x.reverseCount = 0;
                x.reverseSize = !x.reverseSize;
            }

            if (x.x < this._gamewidth){
                x.x += x.speed;
                bulletInZone.push(x)
            }
        }
        this.gameObjects.bullets = bulletInZone;
        /** */
        await this.collisions();
        if (this.globalVariables.player.hp == 0){
            this.globalEvents.gameOver = true;
            let gameOverMessage = document.createElement('p');
            gameOverMessage.innerHTML = "GAME OVER";
            gameOverMessage.style.color = "white";
            document.getElementById("box").innerHTML = "";
            document.getElementById("box").appendChild(gameOverMessage);
        }
        if (this.globalEvents.gameWin == true){
            let gameWinMessage = document.createElement('p');
            gameWinMessage.innerHTML = "CONGRATULATIONS! YOU WIN!";
            gameWinMessage.style.color = "white";
            document.getElementById("box").innerHTML = "";
            document.getElementById("box").appendChild(gameWinMessage);
        }
    }   
    async collisions(){
        /** Bullet Collisions */
        let bulletFlying = [];
        for (let x of this.gameObjects.bullets){   
            let bugAlive = []; 
            let collided = false;
            for (let y of this.gameObjects.bugs){
                if (collided == false){
                    if (
                        (y.y == x.y && x.x <= y.x && x.x + x.radius >= y.x) || 
                        (y.y == x.y && x.x > y.x && x.x <= y.x + 64)
                    ){
                        y.hp -= x.dmg;
                        collided = true;
                        if (y.hp > 0){
                            bugAlive.push(y);
                        }
                        else{
                            this.globalVariables.enemyActiveLanes[y.y/64]--;
                        }
                    } 
                    else{
                        bugAlive.push(y);
                    }
                }
                else{
                    bugAlive.push(y);
                }
            }
            this.gameObjects.bugs = bugAlive;
            if (collided == false){
                bulletFlying.push(x);
            }
        }
        this.gameObjects.bullets = bulletFlying;
        /** */

        /** Fungi - Bug Collision */
        for (let x of this.gameObjects.bugs){
            if (x.phase == false){
                let fungiAlive = [];
                for (let y of this.gameObjects.fungi){
                    if (y.y == x.y && x.x <= y.x && x.x + 64 >= y.x ){
                        x.attacking = true;
                        y.hp -= x.dmg;
                        if (y.hp > 0){
                            fungiAlive.push(y);
                        }
                        else{
                            x.attacking = false;
                            this.globalVariables.playerActiveLanes[y.y / 64]--;
                        }
                    }   
                    else{
                        fungiAlive.push(y);
                    }
                }
                this.gameObjects.fungi = fungiAlive;
            }
        }
        /** */
    }
    render(){
        let assetFungi = this.assetIMG.fungi;
        let assetBugs = this.assetIMG.bugs;
        let assetBackground = this.assetIMG.background;

        this.ctx.clearRect(0,0,this._gamewidth,this._gameheight);
        this.ctx.imageSmoothingEnabled = false;
        if (this.settings.showGrid == true){
            for (let x = 0, xtotal = this._gamewidth; x < xtotal; x += 64){
                for (let y = 64, ytotal = this._gameheight; y < ytotal; y += 64){
                    this.ctx.beginPath();
                    this.ctx.rect(x, y, x + 64, y + 64);
                    this.ctx.strokeStyle = '#212121';
                    this.ctx.stroke();
                    this.ctx.closePath();
                }
            }
        }
        if (this.globalEvents.useAssets == true){
            this.ctx.drawImage( assetBackground[0], 0, 0, 384, 32, 0, 0, 384 * 2, 64);

            for (let x of this.gameObjects.fungi){
                this.ctx.drawImage(
                    assetFungi[x.assetIndex], 
                    x.frameX * 32,
                    x.frameY * 32,
                    32,
                    32,
                    x.x,
                    x.y,
                    64,
                    64
                );
            }

            if (this.gameObjects.bugs.length > 0){
                for (let x of this.gameObjects.bugs){
                    this.ctx.drawImage( assetBugs[0], x.frameX * 32, x.type * 32, 32, 32, x.x, x.y, 64, 64);
                }
            }

            if (this.gameObjects.bullets.length > 0){
                this.ctx.save();
                this.ctx.filter = 'blur(1px)';
                this.ctx.shadowBlur = 5;
                this.ctx.shadowColor = "white";
                for (let x of this.gameObjects.bullets){
                    this.ctx.beginPath();
                    this.ctx.fillStyle = 'white';
                    this.ctx.arc(x.x + 32,x.y + 32,x.radius,0,2 * Math.PI, false);
                    this.ctx.fill();
                    this.ctx.lineWidth = 2;
                    this.ctx.strokeStyle = x.color;
                    this.ctx.stroke();
                    this.ctx.closePath();
                }
                this.ctx.restore();
            }

            this.ctx.save();
            for (let x = 0, xpos = 4 ; x < 4; x++){
                this.ctx.beginPath();
                this.ctx.fillStyle = 'black';
                this.ctx.fillRect(xpos * 64, 0, 64, 64);
                this.ctx.fill();
                this.ctx.closePath();

                this.ctx.beginPath();
                this.ctx.rect(xpos * 64, 0, 64, 64);
                this.ctx.strokeStyle = 'white';
                this.ctx.lineWidth = 1;
                this.ctx.stroke();
                this.ctx.closePath();

                if ( x < 3){
                    if (this.globalVariables.player.mana < this.globalVariables.player.manaRequirement[x]) this.ctx.globalAlpha = 0.5;
                    this.ctx.drawImage( assetFungi[x], 0, 0, 32, 32, xpos * 64, 0, 64, 64);
                    this.ctx.globalAlpha = 1;
                }
                else{
                    this.ctx.drawImage( this.assetIMG.objects[1], 0, 0, 32, 32, xpos * 64, 0, 64, 64);
                }
                xpos++;
            }
            this.ctx.restore();

            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.rect((this.globalEvents.HUDhighlight + 4) * 64, 0, 64, 64);
            this.ctx.strokeStyle = 'white';
            this.ctx.lineWidth = 3;
            this.ctx.stroke();
            this.ctx.closePath();
            this.ctx.restore();

            for (let x = 0, xpos = 32; x < this.globalVariables.player.hp; x ++){
                this.ctx.drawImage( this.assetIMG.objects[0], 0, 0, 32, 32, xpos, 14, 32, 32);
                xpos += 34;
            }
        }   
        this.ctx.beginPath();
        this.ctx.fillRect(32, 48, this.globalVariables.player.mana, 10);
        this.ctx.fillStyle = "white";
        this.ctx.closePath();

        this.ctx.beginPath();
        this.ctx.font = "18px MyWebFont";
        this.ctx.fillText(` Wave 0${this.globalVariables.waves.curWave}`, 675, 32);
        this.ctx.fillStyle = "white";
        this.ctx.closePath();
    }
}

function addImageProcess(src){
    return new Promise((resolve, reject) => {
        let img = new Image()
        img.onload = () => resolve(img)
        img.onerror = reject
        img.src = src
    })
}

async function processor(timestamp){
    if (APPGAME.globalEvents.gameOver == false && APPGAME.globalEvents.gameWin == false){
        APPGAME.update();
        APPGAME.render();
        setTimeout(() => {
            requestAnimationFrame(processor);
        }, 1000 / 14);
    }
}

function getCursorPosition(canvas, event) {
    if (APPGAME.globalEvents.mousePress == false){
        APPGAME.globalEvents.mousePress = true;
        let rect = canvas.getBoundingClientRect();
        let x = Math.floor(event.clientX - rect.left);
        let y = Math.floor(event.clientY - rect.top);

        if (APPGAME.globalEvents.HUDhighlight == 3){
            APPGAME.removeFungi(Math.floor(x / 64),Math.floor(y / 64));
        }
        else{
            APPGAME.addFungi(Math.floor(x / 64),Math.floor(y / 64));
        }
    }
}

window.addEventListener("keyup", function(e){
    if (e.key >= 1 && e.key <= 4){
        APPGAME.globalEvents.HUDhighlight = e.key - 1;
    }
    else if (e.key == 'q'){
        APPGAME.settings.showGrid = !APPGAME.settings.showGrid
    }
    else if (e.key == 'Enter'){
        if (APPGAME.globalEvents.assetsReady == true){
            if (APPGAME.globalEvents.startPlaying == false){
                APPGAME.globalEvents.startPlaying = true;
                APPGAME.setStage();
            }
        }
    }
    else if (e.key == 'r'){
        if (APPGAME.globalEvents.gameOver == true || this.globalEvents.gameWin == true){
            APPGAME = Game();
            APPGAME.createApp();
        }
    }
});
