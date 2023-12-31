import EmpireNameGenerator from '../utilities/empire-name-generator.js';

export default class Empire {	
	static ctx = 0;

    constructor(gameState, oldName) {
        this.allies = [];
        this.enemies = [];
        this.ideology = [Math.random() * 255, Math.random() * 255, Math.random() * 255];

        this.maxSize = 0;
        this.mergeDifficulty = 1000;

        this.name = EmpireNameGenerator.generateEmpireName();

		this.color = [Math.random() * 360, Math.random() * 100];
        this.gameState = gameState;
        this.capital = null;
    }
	
	static setCanvas(canvas) {
		Empire.ctx = canvas.getContext("2d");
	}
	
	setCapital(newCap) {
		this.capital = newCap;
		
		let x = this.capital.getX() * this.gameState.getScale() - (Empire.ctx.measureText(this.name).width / 2);
        let y = this.capital.getY();
        if (x < 0) {
            x = 0;
        }
        if (x + Empire.ctx.measureText(this.name).width > this.gameState.getWidth() * this.gameState.getScale()) {
            x -= Empire.ctx.measureText(this.name).width / 2;
        }
        if (y < 2) {
            y = 2;
        }
		this.titleX = x;
		this.titleY = y;
	}

    tick() {
        if (this.getTerritory().length === 0) {
            return;
        }
		if (Math.random() < 0.03 && this.getEnemies().length == 0) {
			this.ideology[0] *= 0.99;
		} else if(Math.random() < 0.09 * this.getAllies().length) {
			this.ideology[0] *= (1.01 * this.getAllies().length);
			if(this.ideology[0] > 255) {
				this.ideology[0] = 255;
			}
		}
		if(this.getAllies().length > 0 && Math.random() < 0.01) {
			let a = this.getAllies()[Math.floor(Math.random(this.getAllies().length))];
			this.ideology[0] = (this.ideology[0] + this.ideology[0] + a.ideology[0]) / 3;
			this.ideology[1] = (this.ideology[1] + this.ideology[1] + a.ideology[1]) / 3;
			this.ideology[2] = (this.ideology[2] + this.ideology[2] + a.ideology[2]) / 3;
		}
        if (this.gameState.getEmpireForPixel(this.capital) !== this) {
            if (Math.random() < 0.3 && this.getTerritory().length > 0) {
                this.crisisChance();
            } else if (Math.random() < 0.3) {
                this.puppet(this.gameState.getEmpireForPixel(this.capital));
            }
            if (this.getTerritory().length > 0) {
				this.setCapital(this.getTerritory()[0]);
            }
        }
        while (this.getTerritory().includes(null)) {
            this.removeTerritory(null);
        }
        if (this.maxSize > 0 && Math.random() < this.getStability() && this.getTerritory().length > 0) {
            this.crisisChance();
        }

        if (this.getTerritory().length > this.maxSize) {
            this.maxSize = this.getTerritory().length;
        }
        for (let e of this.allies) {
            if (this.ideoDifference(e.ideology) * this.mergeDifficulty < ((this.getCoopIso() + e.getCoopIso()) / 2)) {
                if (this.getTerritory().length > e.getTerritory().length) {
                    e.mergeInto(this);
                } else {
                    this.mergeInto(e);
                }
            }
        }
        const deadEmpires = [];
        for (const e of this.enemies) {
            if (!this.gameState.getEmpires().includes(e)) {
                deadEmpires.push(e);
            }
            this.allies = this.allies.filter(ally => ally !== e);
            e.allies = e.allies.filter(ally => ally !== this);
            if (!e.enemies.includes(this)) {
                e.enemies.push(this);
            }
        }
        for (const e of this.allies) {
            if (!this.gameState.getEmpires().includes(e)) {
                deadEmpires.push(e);
            }
            if (!e.getAllies().includes(this)) {
                deadEmpires.push(e);
            }
            for (const enemy of e.getEnemies()) {
                if (this.allies.includes(enemy)) {
                    if (this.ideoDifference(e) < this.ideoDifference(enemy)) {
                        deadEmpires.push(enemy);
                        enemy.getAllies().splice(this, 1);
                    } else {
                        deadEmpires.push(e);
                        e.getAllies().splice(this, 1);
                    }
                }
            }
        }
        for (const e of deadEmpires) {
            this.enemies = this.enemies.filter(enemy => enemy !== e);
            this.allies = this.allies.filter(ally => ally !== e);
        }
    }

	getIdeology() {
		return this.ideology;
	}
	
	setIdeology(ideo) {
		this.ideology = ideo;
	}

    crisisChance() {
        const p = this.getTerritory()[(Math.random() * this.getTerritory().length) | 0];
		if (Math.random() < 0.05 && this.getTerritory().length > 20) {//5% chance of a revolution spawning somewhere in the empire.
			this.setEnemy(p.revolt([Math.random() * 255, Math.random() * 255, Math.random() * 255]), true, true);
			this.maxSize = this.getTerritory().length;
		} else if (Math.random() < 0.3) {//30% chance of attempting to merge with an allied empire.
			for (const e of this.allies) {
				if (this.ideoDifference(e) * this.mergeDifficulty < (this.getCoopIso() + e.getCoopIso()) * (4 * Math.random())) {
					if (this.getTerritory().length > e.getTerritory().length) {//smaller empire always merges into larger one
						e.mergeInto(this);
					} else {
						this.mergeInto(e);
					}
					this.maxSize = this.getTerritory().length;
					return;
				}
			}
		} else {
			if(Math.random() < 0.1 && this.getTerritory().length < 10) {
				this.removeTerritory(p);
			}
		}
    }

    puppet(e) {//empire's ideology shifts to become more like e. 
		if(!e) {
			return;
		}
        this.ideology[0] = (this.ideology[0] + e.ideology[0]) / 2;
        this.ideology[1] = (this.ideology[1] + e.ideology[1]) / 2;
        this.ideology[2] = (this.ideology[2] + e.ideology[2]) / 2;
        this.makePeace(e);
        this.setAlly(e);
    }

    getCapital() {
        return this.capital;
    }
	

    removeTerritory(pixel) {
        if (this.gameState.getTerritoryManager().getPixelsForEmpire(this).includes(pixel)) {
            this.gameState.getTerritoryManager().removePixelFromEmpire(pixel);
        }
    }

    mergeInto(e) {
        if (!this.gameState.getEmpires().includes(e) || e.getTerritory().length === 0) {
            return;
        }
        const pixels = this.getTerritory();
        for (const p of pixels) {
            if (p !== null && this.gameState.getTerritoryManager().getEmpireForPixel(p) === this) {
                e.addTerritory(p);
                p.setAge(0);
            }
        }
    }
	
	getStability() {
		return 1 - (this.getTerritory().length / this.maxSize);
	}

    render(g) {		
		g.fillStyle = "white";
        g.fillText(this.name, this.titleX, this.titleY * this.gameState.getScale());
    }

    getCoopIso() {
        return this.ideology[0];
    }

    getAuthLib() {
        return this.ideology[1];
    }

    getLeftRight() {
        return this.ideology[2];
    }

    setEnemy(e, recur, log) {
        if (!e || e === this) {
            return;
        }
        const coopIso = (this.ideology[0] + e.getCoopIso()) / 2;
        const ideoDiff = this.ideoDifference(e);
        if (this.allies.includes(e) && coopIso < ideoDiff * 0.16 * Math.random()) {
            this.allies = this.allies.filter(ally => ally !== e);
            e.allies = e.allies.filter(ally => ally !== this);
            this.setEnemy(e, false, false);
        }
        if (!this.enemies.includes(e)) {
            this.enemies.push(e);
            e.setEnemy(this, true, false);
            if (recur) {
                for (const a of this.allies) {
                    a.setEnemy(e, false, true);
                }
            }
        }
    }

    makePeace(e) {
        if (this.enemies.includes(e)) {
            this.enemies = this.enemies.filter(enemy => enemy !== e);
            e.enemies = e.enemies.filter(enemy => enemy !== this);
			for(const a of e.getAllies()) {
				if(a.enemies.includes(this)) {
					a.makePeace(this);
				}
			}
			for(const a of this.getAllies()) {
				if(this.enemies.includes(a)) {
					this.makePeace(a);
				}
			}
        }
    }

    breakAlliance(e) {
        if (this.allies.includes(e)) {
            this.allies = this.allies.filter(ally => ally !== e);
            e.allies = e.allies.filter(ally => ally !== this);
        }
    }
	
    setAlly(e) {
        if (e === this) {
            return;
        }
        for (const a of this.allies) {
            if (a.getEnemies().includes(e)) {
                return;
            }
        }
        for (const a of e.getAllies()) {
            if (a.getEnemies().includes(this)) {
                return;
            }
        }
		this.makePeace(e);
        if (this.allies.includes(e)) {
            return;
        }
        this.allies.push(e);
        e.allies.push(this);
    }
	
	breakAlliance(e) {
		if (e === this) {
			return;
		}
		if (!this.allies.includes(e)) {
			return;
		}
		this.allies = this.allies.filter(ally => ally !== e);
		e.allies = e.allies.filter(ally => ally !== this);
	}

    ideoDifference(e) {
        let total = 0;
        for (let i = 0; i < this.ideology.length; i++) {
            total += Math.abs(this.ideology[i] - e[i]);
        }
        return total;
    }

    addTerritory(pixel) {
        this.gameState.getTerritoryManager().addPixelToEmpire(pixel, this);
    }

    getTerritory() {
        return this.gameState.getTerritoryManager().getPixelsForEmpire(this);
    }

    getName() {
        return this.name;
    }

    getColor() {
        return this.color;
    }

    getEnemies() {
        return this.enemies;
    }

    getIdeologyColor() {
        const colors = this.ideology.map(value => (value > 255 ? 255 : value));
        return [colors[0], colors[1], colors[2]];
    }

    getAllies() {
        return this.allies;
    }

    getAllianceDifficulty() {
        return this.gameState.allianceDifficulty;
    }
}
