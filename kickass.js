/*
	Copyright (c) <2011> <Erik Rothoff Andersson>
	
	This software is provided 'as-is', without any express or implied
	warranty. In no event will the authors be held liable for any damages
	arising from the use of this software.
	
	Permission is granted to anyone to use this software for any purpose,
	including commercial applications, and to alter it and redistribute it
	freely, subject to the following restrictions:
	
	1. The origin of this software must not be misrepresented; you must not
	claim that you wrote the original software. If you use this software
	in a product, an acknowledgment in the product documentation would be
	appreciated but is not required.
	
	2. Altered source versions must be plainly marked as such, and must not be
	misrepresented as being the original software.
	
	3. This notice may not be removed or altered from any source
	distribution.
*/

var KickAss = (function (window) {

  // socket.io object
  var socket = null,
      me = {};

	/*
		Function:
			Class
		
		Simple function to create MooTools-esque classes
	*/
	var Class = function (methods) {
		var ret = function () {
			if (methods && typeof methods.initialize == 'function') {
			  return methods.initialize.apply(this, arguments);
      }
		};
		
		for (var key in methods) {
      if (methods.hasOwnProperty(key)) {
        ret.prototype[key] = methods[key];
      }
    }
		
		return ret;
	};

	if (!Array.prototype.indexOf) {
		// Found at: https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/indexOf
		Array.prototype.indexOf = function (searchElement) {
			if (this === void 0 || this === null)
				throw new TypeError();
		
			var t = Object(this);
			var len = t.length >>> 0;
			if (len === 0)
				return -1;
		
			var n = 0;
			if (arguments.length > 0) {
				n = Number(arguments[1]);
				if (n !== n) // shortcut for verifying if it's NaN
					n = 0;
				else if (n !== 0 && n !== (1 / 0) && n !== -(1 / 0))
				n = (n > 0 || -1) * Math.floor(Math.abs(n));
			}
		
			if (n >= len)
				return -1;
		
			var k = n >= 0 ? n : Math.max(len - Math.abs(n), 0);
		
			for (k; k < len; k++) {
				if (k in t && t[k] === searchElement)
					return k;
			}
			return -1;
		};
	}
	
	/*
		== Classes ==
	*/
	
	var Vector = new Class({
		initialize: function (x, y) {
			if (typeof x == 'Object') {
				this.x = x.x;
				this.y = x.y;
			} else {
				this.x = x;
				this.y = y;
			}
		},

		cp: function () {
			return new Vector(this.x, this.y);
		},

		mul: function (factor) {
			this.x *= factor;
			this.y *= factor;
			return this;
		},

		mulNew: function (factor) {
			return new Vector(this.x * factor, this.y * factor);
		},

		add: function (vec) {
			this.x += vec.x;
			this.y += vec.y;
			return this;
		},

		addNew: function (vec) {
			return new Vector(this.x + vec.x, this.y + vec.y);
		},

		sub: function (vec) {
			this.x -= vec.x;
			this.y -= vec.y;
			return this;
		},

		subNew: function (vec) {
			return new Vector(this.x - vec.x, this.y - vec.y);
		},

		// angle in radians
		rotate: function (angle) {
			var x = this.x, y = this.y;
			this.x = x * Math.cos(angle) - Math.sin(angle) * y;
			this.y = x * Math.sin(angle) + Math.cos(angle) * y;
			return this;
		},

		// angle still in radians
		rotateNew: function (angle) {
			return this.cp().rotate(angle);
		},

		// angle in radians... again
		setAngle: function (angle) {
			var l = this.len();
			this.x = Math.cos(angle) * l;
			this.y = Math.sin(angle) * l;
			return this;
		},

		// RADIANS
		setAngleNew: function (angle) {
			return this.cp().setAngle(angle);
		},

		setLength: function (length) {
			var l = this.len();
			if (l) this.mul(length / l);
			else this.x = this.y = length;
			return this;
		},

		setLengthNew: function (length) {
			return this.cp().setLength(length);
		},

		normalize: function () {
			var l = this.len();
			if (l == 0)
				return this;
			this.x /= l;
			this.y /= l;
			return this;
		},

		normalizeNew: function () {
			return this.cp().normalize();
		},

		angle: function () {
			return Math.atan2(this.y, this.x);
		},

		collidesWith: function (rect) {
			return this.x > rect.x && this.y > rect.y && this.x < rect.x + rect.width && this.y < rect.y + rect.height;
		},

		len: function () {
			var l = Math.sqrt(this.x * this.x + this.y * this.y);
			if (l < 0.005 && l > -0.005) return 0;
			return l;
		},

		is: function (test) {
			return typeof test == 'object' && this.x == test.x && this.y == test.y;
		},
		
		dot: function (v2) {
			return this.x * v2.x + this.y * v2.y;
		},

		toString: function () {
			return '[Vector(' + this.x + ', ' + this.y + ') angle: ' + this.angle() + ', length: ' + this.len() + ']';
		}
	});
	
	/*
		Class:
			Rect
		
		Represents a rectangle at a given point. Uses Vector for positioning
	*/
	
	var Rect = new Class({
		initialize: function (x, y, w, h) {
			this.pos = new Vector(x, y);
			this.size = {width: w, height: h};
		},
		
		getRight: function () {
			return this.pos.x + this.size.width/2;
		},
		
		getBottom: function () {
			return this.pos.y + this.size.height/2;
		}
	});
	
	/*
		== Utility functions ==
	*/
	
	/*
		Function:
			now
			
		Returns the current time in milliseconds
	*/
	
	function now() {
		return (new Date()).getTime();
	}
	
	/*
		Function:
			bind
		
		Bind the <this> variable in a function call
	*/
	
	function bind(bound, func) {
		return function () {
			return func.apply(bound, arguments);
		}
	}
	
	/*
		Function:
			elementIsContainedIn
		
		Check if the element1 contains the element2
		
		Parameters:
			(element) element1 - The element to check if it HAS the element2
			(element) element2 - The element to check if it is INSIDE element1
	*/
	
	function elementIsContainedIn(element1, element2) {
		if (element.contains)
			return element1.contains(element2);
		return !!(element1.compareDocumentPosition(element2) & 16);
	};
	
	/*
		Function:
			code
		
		Turn a key code into it's corresponding string value.
		
		Parameters:
			(number) name - The keycode
		
		Returns:
			The string value. For up/down/left/right/esc-button it will return that.
			Note that for letters it will be in it's capitalised form
	*/
	
	function code(name) {
		var table = {38: 'up', 40: 'down', 37: 'left', 39: 'right', 27: 'esc'};
		if (table[name]) return table[name];
		return String.fromCharCode(name);
	};
	
	/*
		Function:
			random
		
		Generate a random number in the range ''' from <= x <= to '''.
		
		Parameters:
			(number) from - The starting point
			(number) to - The end point
	*/
	
	function random(from, to) {
		return Math.floor(Math.random() * (to + 1) + from);
	};
	
	/*
		Class:
			KickAss
		
		The main entry point for the game
	*/
	
	var KickAss = new Class({
		initialize: function () {
			// Holds all the player instances
      this.player = null;
			this.enemies = {};
			
			// Holds an array of elements related to this game
			// this should maybe be replaced with something wiser
			this.elements = [];
			
			// The manager of bullets
			this.bulletManager = new BulletManager();
			this.bulletManager.game = this;
			
			// The manager of explosions
			this.explosionManager = new ExplosionManager();
			this.explosionManager.game = this;
			
			// Manager for menus
			this.menuManager = new MenuManager();
			this.menuManager.game = this;
			this.menuManager.create();
			
			// Time of last game loop run
			this.lastUpdate = now();
			
			// A map of keys that are pressed
			this.keyMap = {};
			
			// Bind global events
			this.keydownEvent = bind(this, this.keydown);
			this.keyupEvent = bind(this, this.keyup);
			
			document.addEventListener('keydown', this.keydownEvent, false);
			document.addEventListener('keyup', this.keyupEvent, false);
			document.addEventListener('keypress', this.keydownEvent, false);
			
			// We keep track of scrolling information and window size
			this.scrollPos = new Vector(0, 0);
			this.windowSize = {width: 900, height: 600};
			
      var stage = document.getElementById('game');
      stage.style.width = this.windowSize.width + 'px';
      stage.style.height = this.windowSize.height + 'px';
      stage.style.border = '1px dotted black';
      // TODO
//			this.updateWindowInfo();
		},
		
		begin: function () {
			// Add first player
			this.addPlayer();
			
			// Begin loop
			this.loopTimer = window.setInterval(bind(this, this.loop), 1000/60);
		},
		
		keydown: function (e) {
			var c = code(e.keyCode);
			this.keyMap[c] = true;
			
			switch (c) {
				// These events should be stopped
				case 'left':
				case 'right':
				case 'up':
				case 'down':
				case 'esc':
				case ' ':
					if (e.stopPropogation)
						e.stopPropogation();
					if (e.preventDefault)
						e.preventDefault();
					e.returnValue = false;
				break;
			}
			
			switch (c) {
				case 'esc':
					this.destroy();
					break;
			}
		},
		
		keyup: function (e) {
			var c = code(e.keyCode);
			this.keyMap[c] = false;
			
			switch (c) {
				// These events should be stopped
				case 'left':
				case 'right':
				case 'up':
				case 'down':
				case 'esc':
				case ' ':
					if (e.stopPropogation)
						e.stopPropogation();
					if (e.preventDefault)
						e.preventDefault();
					e.returnValue = false;
				break;
			}
		},
		
		/*
			Method:
				loop
			
			This is the game loop, subsequently, the most important part of the game.
			Takes care of updating everything, and seeing to that everything is drawn 
			as it should be.
		*/
		
		loop: function () {
      var self = this;
			var currentTime = now();
			var tdelta = (currentTime - this.lastUpdate)/1000;
			
//			this.updateWindowInfo();
			
      if (this.player) {
        this.player.update(tdelta);
      }

      Object.keys(this.enemies).forEach(function (enemy) {
        self.enemies[enemy].update(tdelta);
      });
			
			// Update bullets
			this.bulletManager.update(tdelta);
			
			// Update explosions
			this.explosionManager.update(tdelta);
			
			this.lastUpdate = currentTime;
		},
		
		/*
			Method:
				addPlayer
			
			Adds a player controled by the user. For mega mayhem.
		*/
		
		addPlayer: function () {
			var player = new Player();
			player.game = this;
			
			this.player = player;
			
			this.explosionManager.addExplosion(player.pos);
		},

    addEnemy: function (id) {
			var enemy = new Enemy(id);
			enemy.game = this;
			
      this.enemies[id] = enemy;

			this.explosionManager.addExplosion(enemy.pos);
    },
		
		/*
			Method:
				isKickAssElement
			
			Check if the passed element is child of a registered element.
			
			Parameters:
				(element) el - The element to check
		*/
		
		isKickAssElement: function (el) {
			for (var i = 0, element; element = this.elements[i]; i++) {
				if (el === element || elementIsContainedIn(element, el))
					return true;
			}
			return false;
		},
		
		/*
			Method:
				isKeyPressed
			
			Check wether a key is pressed.
			
			Parameters:
				(string) key - The key to be checked if it's pressed
			
			Return:
				bool - True if it's pressed
		*/
		
		isKeyPressed: function (key) {
			return !!this.keyMap[key];
		},
		
		/*
			Method:
				updateWindowInfo
			
			Update information regarding the window, scroll position and size.
		*/
		
		updateWindowInfo: function () {
//FIXME
			this.windowSize = {
				width: 300,
//document.documentElement.clientWidth,
				height: 300
//document.documentElement.clientHeight
			};

			this.scrollPos.x = window.pageXOffset || document.documentElement.scrollLeft;
			this.scrollPos.y = window.pageYOffset || document.documentElement.scrollTop;
		},
		
		/*
			Method:
				hideAll
			
			Hide everything related to Kick ass. This will be everything that has the
			classname "KICKASSELEMENT".
		*/
		
		hideAll: function () {
			for (var i = 0, el; el = this.elements[i]; i++)
				el.style.visibility = 'hidden';
		},
		
		/*
			Method:
				showAll
			
			This shows everything hidden by hideAll.
		*/
		
		showAll: function () {
			for (var i = 0, el; el = this.elements[i]; i++)
				el.style.visibility = 'visible';
		},
		
		/*
			Method:
				destroy
			
			Remove every trace of Kick Ass.
		*/
		
		destroy: function () {
      var that = this;

			// Remove global events
			document.removeEventListener('keydown', this.keydownEvent, false);
			document.removeEventListener('keypress', this.keydownEvent, false);
			document.removeEventListener('keyup', this.keyupEvent, false);
			
      this.player.destroy();

			// Destroy everything
      Object.keys(this.enemies).forEach(function (enemy) {
        that.enemies[enemy].destroy();
      });
			
			this.bulletManager.destroy();
			this.explosionManager.destroy();
			this.menuManager.destroy();
			
			// Stop game timer
			clearInterval(this.loopTimer);

      socket.send({
        method: "quit",
        guid: me.GUID
      });
		}
	});
	
	/*
		Class:
			MenuManager
		
		Manages anything that resembles a menu. Points, "Press esc to quit".
	*/
	
	var MenuManager = new Class({
		initialize: function () {
			this.numPoints = 0;
		},
		
		create: function () {
			// Container 
			this.container = document.createElement('div');
			this.container.className = 'KICKASSELEMENT';
			
      var style = this.container.style;
			style.position = 'fixed';
			style.bottom = '20px';
			style.right = '20px';
			style.font = '16pt Arial';
			style.color = 'black';
			style.zIndex = '1000000';
			style.textAlign = 'right';

			document.getElementById('game').appendChild(this.container);
			
			// Points view
			this.points = document.createElement('div');
			this.points.className = 'KICKASSELEMENT';
			this.points.style.fontSize = '30pt';
			this.points.innerHTML = this.numPoints;
			this.container.appendChild(this.points);
			
			// Esc to quit text
			this.escToQuit = document.createElement('div');
			this.escToQuit.className = 'KICKASSELEMENT';
			this.escToQuit.innerHTML = 'Press esc to quit';
			this.container.appendChild(this.escToQuit);
			
/*
			this.game.registerElement(this.container);
			this.game.registerElement(this.points);
			this.game.registerElement(this.escToQuit);
*/
		},
		
		/*
			Method:
				addPoints
			
			Add points to the scorecard.
			
			Parameters:
				(int) killed - The number of points killed in 
		*/
		
		addPoints: function (killed) {
			this.numPoints += killed*10;
			this.points.innerHTML = this.numPoints;
		},
		
		destroy: function () {
/*
			this.game.unregisterElement(this.container);
			this.game.unregisterElement(this.escToQuit);
			this.game.unregisterElement(this.points);
*/			
			this.container.parentNode.removeChild(this.container);
		}
	});
	
	/*
		Class:
			Player
		
		Keeps track of all the high-level stuff for a player.
		
		Each player is assigned it's own canvas that it's drawn on.
	*/
	
  // switching Player to prototypical inheritance
	var Player = function () {
    this.initialize();
  };

  Player.prototype = {
    initialize: function () {
      this.id = me.GUID;
      
      // Vertices for the player
      // Remember that the ship should be pointing to the left
      this.verts = [
        [-10, 10],
        [15, 0],
        [-10, -10],
        [-10, 10]
      ];
      
      this.size = {width: 20, height: 30};
      
      // Flame vertices
      this.flames = {r: [], y: []};
      
      // The canvas for the ship, leave some room for the flames 
      this.sheet = new Sheet(new Rect(100, 100, 50, 50));
      
      // Physics
      this.pos = new Vector(Math.random() * me.KickAss.windowSize.width, Math.random() * me.KickAss.windowSize.height);
      this.vel = new Vector(0, 0);
      this.acc = new Vector(0, 0);
      this.dir = new Vector(1, 0);
      this.currentRotation = 0;
      
      // Physics-related constants
      this.friction = 0.8;
      this.terminalVelocity = 2000;
      
      this.lastPos = new Vector(0, 0);
      this.lastFrameUpdate = 0;
      
      this.generateFlames();
    },		

		update: function (tdelta) {
      // shooting
      this.fire = (this.game.isKeyPressed(' ') && now() - this.game.bulletManager.lastFired > 250);

			// Rotation
			if (this.game.isKeyPressed('left')) {
				this.rotateLeft();
			} else if (this.game.isKeyPressed('right')) {
				this.rotateRight();
			} else {
				this.stopRotate();
			}
			
			this.thrustersActive = this.game.isKeyPressed('up');

			// Activate thrusters!
			if (this.thrustersActive) {
				this.activateThrusters();
			} else {
				this.stopThrusters();
			}

			// Add rotation
			if (this.currentRotation) {
				this.dir.setAngle(this.dir.angle() + this.currentRotation*tdelta);
      }			

			// Add acceleration to velocity
			// The equation for the friction is:
			//      velocity += acceleration - friction*velocity
			// Found at: http://stackoverflow.com/questions/667034/simple-physics-based-movement
			var frictionedAcc = this.acc.mulNew(tdelta).sub(this.vel.mulNew(tdelta*this.friction))
			this.vel.add(frictionedAcc);
			
			// Cap velocity
			if (this.vel.len() > this.terminalVelocity)
				this.vel.setLength(this.terminalVelocity);
			
			// Add velocity to position
			this.pos.add(this.vel.mulNew(tdelta));
			
			// Update flames?
			if (now() - this.lastFrameUpdate > 1000/15)
				this.generateFlames();
			
			// Check bounds and update accordingly
			this.checkBounds();
			
			// Only update canvas if any changes have occured
			if (!this.lastPos.is(this.pos) || this.currentRotation) {
				// Draw changes onto canvas
				this.sheet.clear();
				this.sheet.setAngle(this.dir.angle());
				this.sheet.setPosition(this.pos);
				
				// Draw flames if thrusters are activated
				if (!this.acc.is({x: 0, y: 0})) {
					this.sheet.drawFlames(this.flames);
				}
				
				this.sheet.drawPlayer(this.verts);
				
				this.lastPos = this.pos.cp();
			}

      // send to socket
      socket.send({
        guid: me.GUID,
        pos: {
          x: this.pos.x,
          y: this.pos.y
        },
        currentRotation: this.currentRotation,
			  thrustersActive: this.thrustersActive,
        fire: this.fire,
        method: "position"
      });

		},
		
		/*
			Method:
				generateFlames
			
			Update flames every 0.2 seconds or something. Generates new flame
			polygons for red/yellow
		*/
		
		generateFlames: function () {
			var rWidth = this.size.width,
				rIncrease = this.size.width * 0.1,
				yWidth = this.size.width * 0.6,
				yIncrease = yWidth * 0.2,
				halfR = rWidth / 2,
				halfY = yWidth / 2,
				halfPlayerHeight = this.size.height / 4;
				
			// Firstly recreate the flame vertice arrays
			this.flames.r = [[-1 * halfPlayerHeight, -1 * halfR]];
			this.flames.y = [[-1 * halfPlayerHeight, -1 * halfY]];

			for (var x = 0; x < rWidth; x += rIncrease)
				this.flames.r.push([-random(2, 7) - halfPlayerHeight, x - halfR]);

			this.flames.r.push([-1 * halfPlayerHeight, halfR]);
			
			// And the yellow flames
			for (var x = 0; x < yWidth; x += yIncrease)
				this.flames.y.push([-random(2, 7) - halfPlayerHeight, x - halfY]);

			this.flames.y.push([-1 * halfPlayerHeight, halfY]);
		
			this.lastFrameUpdate = now();
		},
		
		/*
			Method:
				checkBounds
			
			Update the bounds so we don't encounter any strange scrollbars.
			Scroll ship if it's out of bounds, or just move it to the other side
		*/
		
		checkBounds: function () {
			var w = this.game.windowSize.width;
			var h = this.game.windowSize.height;
			
			// Because the sheet is larger than the ship itself setting it
			// to the right most position can cause a scrollbar to appear
			// therefor the right bound is the x-position, including half the sheet width
			var rightBound = this.pos.x + this.sheet.rect.size.width/2;
			var bottomBound = this.pos.y + this.sheet.rect.size.height/2;
			
			// Check bounds X
			if (rightBound > w) {
				window.scrollTo(this.game.scrollPos.x + 50, this.game.scrollPos.y);
				this.pos.x = 0;
			} else if (this.pos.x < 0) {
				window.scrollTo(this.game.scrollPos.x - 50, this.game.scrollPos.y);
				this.pos.x = w - this.sheet.rect.size.width/2;
			}
			
			// check bounds Y
			if (bottomBound > h) {
				window.scrollTo(this.game.scrollPos.x, this.game.scrollPos.y + h * 0.75);
				this.pos.y = 0;
			} else if (this.pos.y < 0) {
				window.scrollTo(this.game.scrollPos.x, this.game.scrollPos.y - h * 0.75);
				this.pos.y = h - this.sheet.rect.size.height/2;
			}
		},
		
		// Activate and deactivate thrusters, thus accelerating the ship
		activateThrusters: function () {
			this.acc = (new Vector(500, 0)).setAngle(this.dir.angle());
		},
		
		stopThrusters: function () {
			this.acc = new Vector(0, 0);
		},
		
		// Rotate left/right/stop rotation methods
		rotateLeft: function () {
			this.currentRotation = -Math.PI*2;
		},
		
		rotateRight: function () {
			this.currentRotation = Math.PI*2;
		},
		
		stopRotate: function () {
			this.currentRotation = 0;	
		},
		
		destroy: function () {
			this.sheet.destroy();
		}
	};
	
  var Enemy = function (id) {
    this.initialize();
    this.id = id;
  };

  Enemy.prototype = Object.create(Player.prototype);

  Enemy.prototype.update = function (tdelta) {

    // Activate thrusters!
    if (this.thrustersActive) {
      this.activateThrusters();
    } else {
      this.stopThrusters();
    }

    // Add rotation
    if (this.currentRotation) {
      this.dir.setAngle(this.dir.angle() + this.currentRotation*tdelta);
    }    

    // Add acceleration to velocity
    // The equation for the friction is:
    //      velocity += acceleration - friction*velocity
    // Found at: http://stackoverflow.com/questions/667034/simple-physics-based-movement
    var frictionedAcc = this.acc.mulNew(tdelta).sub(this.vel.mulNew(tdelta*this.friction))
    this.vel.add(frictionedAcc);
    
    // Cap velocity
    if (this.vel.len() > this.terminalVelocity)
      this.vel.setLength(this.terminalVelocity);
    
    // Add velocity to position
    this.pos.add(this.vel.mulNew(tdelta));
    
    // Update flames?
    if (now() - this.lastFrameUpdate > 1000/15)
      this.generateFlames();
    
    // Check bounds and update accordingly
    this.checkBounds();
    
    // Only update canvas if any changes have occured
    if (!this.lastPos.is(this.pos) || this.currentRotation) {
      // Draw changes onto canvas
      this.sheet.clear();
      this.sheet.setAngle(this.dir.angle());
      this.sheet.setPosition(this.pos);
      
      // Draw flames if thrusters are activated
      if (!this.acc.is({x: 0, y: 0})) {
        this.sheet.drawFlames(this.flames);
      }
      
      this.sheet.drawPlayer(this.verts);
      
      this.lastPos = this.pos.cp();
		}
  };

	/*
		Class:
			BulletManager
		
		Keeps track of all the bullets, collision detection, bullet life time
		and those things.
	*/
	
	var BulletManager = new Class({
		initialize: function () {
			this.bullets = {};
			this.lastFired = 0;
			
			this.lastBlink = 0;
			this.blinkActive = false;
			this.enemyIndex = [];
		},
		
		update: function (tdelta) {
      var self = this.game,
          that = this;

			// If spacebar is pressed down, and only shoot every 0.1 second
			if (this.game.player && this.game.player.fire) {
        this.addBulletFromPlayer(this.game.player);

				this.lastFired = now();
			}
			
      // enemy fire!
      Object.keys(self.enemies).forEach(function (enemy) {
        if (self.enemies[enemy].fire === true) {
          that.addBulletFromPlayer(self.enemies[enemy]);
        }
      });

			// If B is pressed, show remaining enemies
/*
			if (this.game.isKeyPressed('B')) {
				this.blink();
			} else {
				this.endBlink();
			}
*/	
		
			for (var key in this.bullets) if (this.bullets.hasOwnProperty(key)) {
				var time = now(); // the time... is now
				
				// Remove bullets older than 2 seconds
				for (var i = 0, bullet; bullet = this.bullets[key][i]; i++) {
					if (time - bullet.bornAt > 2000) {
						bullet.destroy();
						this.bullets[key].splice(i, 1);
					}
				}
			
				for (var i = 0, bullet; bullet = this.bullets[key][i]; i++) {
					bullet.update(tdelta);
					
					// Hide everything related to this game so it can't be hit
					this.game.hideAll();
					
          // if it's your bullet, we check for collision
          if (key === me.GUID) {
					  var hit = bullet.checkCollision();
            // If we hit something remove the element, add an explosion and remove the bullet
            if (hit) {
              this.game.explosionManager.addExplosion(bullet.pos);

              // FIXME - right now the kill is one way, make it two way, one sends the kill the other acknowledges it's been killed
              socket.send({
                guid: hit,
                method: "kill"
              });

              // delete enemy
              // TODO should wait for confirmation before deleting
              this.game.enemies[hit].destroy();
              delete this.game.enemies[hit];

              // add points
              this.game.menuManager.addPoints(10);

              bullet.destroy();
              this.bullets[key].splice(i, 1);
            }
          }
 
					// Show it again
					this.game.showAll();
				}
			}
		},
		
		/*
			Method:
				addBulletFromPlayer
			
			Add bullet at the position of a player's cannon
		*/
		
		addBulletFromPlayer: function (player) {
			var pid = player.id;
			
			// If the player has more than 10 bullets, remove the oldest one
			if (this.bullets[pid] && this.bullets[pid].length > 10) {
				this.bullets[pid][0].destroy();
				this.bullets[pid].shift();
			}
			
			var bullet = new Bullet();
			bullet.manager = this;
			bullet.pos = player.pos.cp();
			bullet.dir = player.dir.cp();
			bullet.game = this.game;
			
			// Make sure the bullet is traveling faster than the player
			bullet.vel.add(bullet.vel.cp().setLength(player.vel.len()));
			
			// Bullets are stored per ship, ensure we have an array for this ship
			if (!this.bullets[pid])
				this.bullets[pid] = [];
			
			this.bullets[pid].push(bullet);
		},
		
		destroy: function () {
			for (var key in this.bullets) if (this.bullets.hasOwnProperty(key)) 
				for (var i = 0, bullet; bullet = this.bullets[key][i]; i++)
					bullet.destroy();
			this.bullets = {};
		}
	});
	
	/*
		Class:
			Bullet
		
		Represents a bullet, and takes care of high-level bullet management.
		Does not take care of collision detection. That's the BulletManager's
		job.
	*/
	
	var Bullet = new Class({
		initialize: function () {
			this.pos = new Vector(100, 100);
			this.dir = new Vector(1, 1);
			this.vel = new Vector(500, 500);
			
			this.bornAt = now();
			
			this.sheet = new Sheet(new Rect(this.pos.x, this.pos.y, 5, 5));
			this.sheet.drawBullet();
		},
		
		update: function (tdelta) {
			this.pos.add(this.vel.setAngle(this.dir.angle()).mulNew(tdelta));
			
			this.checkBounds();
			this.sheet.setPosition(this.pos);
		},
		
		/*
			Method:
				checkCollision
			
			Get the element the bullet is currently over.
			
			Returns:
				The element that the bullet is on, or false.
		*/
		
		checkCollision: function () {
      var self = this,
          hit = false;

      Object.keys(this.game.enemies).forEach(function (enemy) {
        var ship = self.game.enemies[enemy];

        if (
          self.pos.x >= ship.pos.x && self.pos.x <= ship.pos.x + ship.size.width
          &&
          self.pos.y >= ship.pos.y && self.pos.y <= ship.pos.y + ship.size.height
        ) {
          hit = enemy;
          return hit;
        }
      });

      return hit;
		},
				
		// See: <Player.checkBounds>
		checkBounds: function () {
			var w = this.game.windowSize.width;
			var h = this.game.windowSize.height;
			
			var rightBound = this.pos.x + this.sheet.rect.size.width/2;
			var bottomBound = this.pos.y + this.sheet.rect.size.height/2;
			
			// Check bounds X
			if (rightBound > w)
				this.pos.x = 0;
			else if (this.pos.x < 0)
				this.pos.x = w - this.sheet.rect.size.width/2;
			
			// Check bounds Y
			if (bottomBound > h)
				this.pos.y = 0;
			else if (this.pos.y < 0)
				this.pos.y = h - this.sheet.rect.size.height/2;
		},
		
		destroy: function () {
			this.sheet.destroy();
		}
	});
	
	/*
		Class:
			ExplosionManager
		
		Manager for explosions. 
	*/
	
	var ExplosionManager = new Class({
		initialize: function () {
			this.explosions = [];
		},
		
		update: function (tdelta) {
			var time = now();
			
			for (var i = 0, explosion; explosion = this.explosions[i]; i++) {
				// Remove explosions older than 0.3 seconds
				if (time - explosion.bornAt > 300) {
					explosion.destroy();
					this.explosions.splice(i, 1);
					continue;
				}
				
				// Update it
				explosion.update(tdelta);
			}
		},
		
		/*
			Method:
				addExplosion
			
			Add explosion at the center of a point.
			
			Parameters:
				(Vector) pos - The position of the explosion
		*/
		
		addExplosion: function (pos) {
			var explosion = new Explosion(pos);
			explosion.game = this.game;
			explosion.checkBounds();
			
			this.explosions.push(explosion);
		},
		
		destroy: function () {
			for (var i = 0, explosion; explosion = this.explosions[i]; i++)
				explosion.destroy();
			this.explosions = [];
		}
	});
	
	/*
		Class:
			Explosion
		
		Class that represents an explosion. The drawing, lifetime, etc
	*/
	
	var Explosion = new Class({
		initialize: function (pos) {
			this.bornAt = now();
			this.pos = pos.cp();
			this.particleVel = new Vector(400, 0);
			
			this.generateParticles();
			
			this.sheet = new Sheet(new Rect(pos.x, pos.y, 250, 250));
		},
		
		update: function (tdelta) {
			var vel = this.particleVel.mulNew(tdelta);
			
			for (var i = 0, particle; particle = this.particles[i]; i++)
				particle.pos.add(particle.vel.mulNew(tdelta).mul(random(0.5, 1.0)).setAngle(particle.dir.angle()));
			
			this.sheet.clear();
			this.sheet.drawExplosion(this.particles);
		},
		
		/*
			Method:
				generateParticles
			
			Generate around 30 particles that fly in a random direction
		*/
		
		generateParticles: function () {
			this.particles = [];
			
			// Generate 
			for (var i = 0, j = (typeof Raphael != 'undefined') ? 10 : 40; i < j; i++) {
				this.particles.push({
					dir: (new Vector(random(0, 20)-10, random(0, 20)-10)).normalize(),
					vel: this.particleVel.cp(),
					pos: new Vector(0, 0)
				});
			}
		},
		
		/*
			Method:
				checkBounds
			
			This is just a quick test to see if the sheet is outside of the window
			if it is, we just adjust it so it doesn't cause any scrollbars.
		*/
		
		checkBounds: function () {
			// Just do a quick bounds check on the sheet
			var right = this.sheet.rect.getRight();
			var bottom = this.sheet.rect.getBottom();
			
			var w = this.game.windowSize.width;
			var h = this.game.windowSize.height;
			
			if (right > w)
				this.pos.x -= right - w;
			if (bottom > h)
				this.pos.y -= bottom - h;
			
			this.sheet.setPosition(this.pos);
		},
		
		destroy: function () {
			this.sheet.destroy();
		}
	});
	
	/*
		Class:
			Sheet
		
		Abstraction for choosing between Raphael or canvas when drawing things.
	*/
	
	var Sheet = new Class({
		initialize: function (rect) {
			this.rect = rect;
			
			if (typeof Raphael != 'undefined')
				this.drawer = new SheetRaphael(rect);
			else
				this.drawer = new SheetCanvas(rect);
		},
		
		/*
			Method:
				clear
			Clear the sheet to a initial blank state
		*/
		
		clear: function () {
			this.drawer.clear();
		},
		
		/*
			Method:
				setPosition
		*/
		
		setPosition: function (pos) {
			this.rect.pos = pos.cp();
			this.drawer.rect = this.rect;
			this.drawer.updateCanvas();
		},
		
		
		/*
			Method:
				setAngle
			Set the angle used when drawing things
		*/
		
		setAngle: function (angle) {
			this.drawer.setAngle(angle);
		},
		
		/*
			Method:
				drawPlayer
			
			Specialised method for drawing the player. Takes the verts
			and draws it with a black border around a white body
		*/
		
		drawPlayer: function (verts) {
			this.drawer.setFillColor('white');
			this.drawer.setStrokeColor('black');
			this.drawer.setLineWidth(1.5);
			
			this.drawer.tracePoly(verts);
			this.drawer.fillPath();
			
			this.drawer.tracePoly(verts);
			this.drawer.strokePath();
		},
		
		/*
			Method:
				drawFlames
			
			Specialised method for drawing flames.
			
			Parameters:
				(object) flames - An object with an r- and y-property, 
									containing arrays of vertices
		*/
		
		drawFlames: function (flames) {
			this.drawer.setStrokeColor('red');
			this.drawer.tracePoly(flames.r);
			this.drawer.strokePath();
			
			this.drawer.setStrokeColor('yellow');
			this.drawer.tracePoly(flames.y);
			this.drawer.strokePath();
		},
		
		/*
			Method:
				drawBullet
			
			Specialised method for drawing a bullet. It's basically just a circle.
		*/
		
		drawBullet: function () {
			this.drawer.setFillColor('black');
			this.drawer.drawCircle(2.5);
		},
		
		/*
			Method:
				drawExplosion
			
			Specialised method for drawing explosions.
			
			Parameters:
				(array) particles - An array of particles. These particles are actually
										objects with a pos-property (among other things)
		*/
		
		drawExplosion: function (particles) {
			for (var i = 0, particle; particle = particles[i]; i++) {
				// Set a random particle color
				this.drawer.setFillColor(['yellow', 'red'][random(0, 1)]);
				this.drawer.drawLine(particle.pos.x, particle.pos.y, particle.pos.x - particle.dir.x * 10, particle.pos.y - particle.dir.y * 10);
			}
		},
		
		destroy: function () {
			this.drawer.destroy();
		}
	});
	
	/*
		Class:
			SheetRaphael
		
		Abstracts a lot of the drawing to Raphael SVG
	*/
	
	var SheetRaphael = new Class({
		initialize: function (rect) {
			this.rect = rect;
			
			this.fillColor = 'black';
			this.strokeColor = 'black';
			this.lineWidth = 1.0;
			this.polyString = '';
			
			this.raphael = Raphael(this.rect.pos.x-this.rect.size.width/2, this.rect.pos.y-this.rect.size.height/2, this.rect.size.width, this.rect.size.height);
			this.raphael.canvas.style.zIndex = '10000';
			this.raphael.canvas.className = 'KICKASSELEMENT';
			
			// -- bad style?
//			me.KickAss.registerElement(this.raphael.canvas);
			// --
		},
		
		// See: <SheetCanvas>
		tracePoly: function (verts) {
			// Nothing to draw
			if (!verts[0]) return;
			
			this.polyString = 'M' + verts[0][0] + ' ' + verts[0][1];
			for (var i = 0; i < verts.length; i++)
				this.polyString += 'L' + verts[i][0] + ' ' + verts[i][1];
		},
		
		// See: <SheetCanvas>
		setAngle: function (angle) {
			this.angle = angle;
		},
		
		// See: <SheetCanvas>
		updateCanvas: function () {
			this.raphael.canvas.width = this.rect.size.width;
			this.raphael.canvas.height = this.rect.size.height;
			
			this.raphael.canvas.style.left = me.KickAss.scrollPos.x + (this.rect.pos.x - this.rect.size.width/2) + 'px';
			this.raphael.canvas.style.top = me.KickAss.scrollPos.y + (this.rect.pos.y - this.rect.size.height/2) + 'px';
		},
		
		// See: <SheetCanvas>
		drawLine: function (xFrom, yFrom, xTo, yTo) {
			this.tracePoly([[xFrom, yFrom], [xTo, yTo]]);
			this.fillPath();
		},
		
		// See: <SheetCanvas>
		drawCircle: function (radius, pos) {
			pos = pos || {x: 0, y: 0};
			this.currentElement = this.raphael.circle(pos.x, pos.y, radius);
			this.currentElement.attr('fill', this.fillColor);
		},
		
		// See: <SheetCanvas>
		setFillColor: function (color) {
			this.fillColor = color;
		},
		
		// See: <SheetCanvas>
		setStrokeColor: function (color) {
			this.strokeColor = color;
		},
		
		// See: <SheetCanvas>
		setLineWidth: function (width) {
			this.lineWidth = width;
		},
		
		// See: <SheetCanvas>
		fillPath: function () {
			this.currentElement = this.raphael.path(this.polyString);
			this.currentElement.translate(this.rect.size.width/2, this.rect.size.height/2);
			this.currentElement.attr('fill', this.fillColor);
			this.currentElement.attr('stroke', this.fillColor);
			this.currentElement.rotate(Raphael.deg(this.angle), this.rect.size.width/2, this.rect.size.height/2);
		},
		
		// See: <SheetCanvas>
		strokePath: function () {
			this.currentElement = this.raphael.path(this.polyString);
			this.currentElement.attr('stroke', this.strokeColor);
			this.currentElement.attr('stroke-width', this.lineWidth);
			this.currentElement.translate(this.rect.size.width/2, this.rect.size.height/2);
			this.currentElement.rotate(Raphael.deg(this.angle), this.rect.size.width/2, this.rect.size.height/2);
		},
		
		// See: <SheetCanvas>
		clear: function () {
			this.raphael.clear();
		},
		
		destroy: function ()  {
			this.raphael.remove();
		}
	});
	
	/*
		Class:
			SheetCanvas
		
		Abstracts a lot of the canvas drawing into a "sheet". 
	*/
	
	var SheetCanvas = new Class({
		/*
			Constructor
			
			Parameters:
				(Rect) rect - The size and position of the element. The position is the element's center 
		*/
		
		initialize: function (rect) {
			this.canvas = document.createElement('canvas');
			this.canvas.className = 'KICKASSELEMENT';
			with (this.canvas.style) {
				position = 'absolute';
				zIndex = '1000000';
			}
			
			if (this.canvas.getContext)
				this.ctx = this.canvas.getContext('2d');
			
			this.rect = rect;
			this.angle = 0;
			
			this.updateCanvas();
			(document.getElementById('game')).appendChild(this.canvas);
		},
		
		/*
			Method:
				tracePoly
			
			Add points that will be drawn with <fillPath> or <strokePath>
		*/
		
		tracePoly: function (verts) {
			// Nothing to draw
			if (!verts[0]) return;
			
			// Move to center of canvas and rotate the coordinate system
			this.ctx.save();
			this.ctx.translate(this.rect.size.width/2, this.rect.size.height/2);
			this.ctx.rotate(this.angle);
			
			// Trace every vertice
			this.ctx.beginPath();
			this.ctx.moveTo(verts[0][0], verts[0][1]);
			for (var i = 0; i < verts.length; i++)
				this.ctx.lineTo(verts[i][0], verts[i][1]);
			
			this.ctx.restore();
		},
		
		/*
			Method:
				setAngle
			Set the angle used when drawing things
		*/
		
		setAngle: function (angle) {
			this.angle = angle;
		},
		
		/*
			Method:
				updateCanvas
			
			Update the position and size of the current canvas element
		*/
		
		updateCanvas: function () {
			if (this.canvas.width != this.rect.size.width)
				this.canvas.width = this.rect.size.width;
			if (this.canvas.height != this.rect.size.height)
				this.canvas.height = this.rect.size.height;
			
			this.canvas.style.left = me.KickAss.scrollPos.x + (this.rect.pos.x - this.rect.size.width/2) + 'px';
			this.canvas.style.top = me.KickAss.scrollPos.y + (this.rect.pos.y - this.rect.size.height/2) + 'px';
		},
		
		/*
			Method:
				drawLine
			
			Draw a not-so-liney line.
			
			Parameters:
				(number) xFrom - The x starting coordinate
				(number) yFrom - The y starting coordinate
				(number) xTo - The x end coordinate
				(number) yTo - The y end coordinate
		*/
		
		drawLine: function (xFrom, yFrom, xTo, yTo) {
			this.ctx.save();
			this.ctx.translate(this.rect.size.width/2, this.rect.size.height/2);
			
			this.ctx.beginPath();
			this.ctx.moveTo(xFrom, yFrom);
			this.ctx.lineTo(xTo, yTo);
			this.ctx.lineTo(xTo + 2, yTo + 2);
			this.ctx.closePath();
			this.ctx.fill();
			
			this.ctx.restore();
		},
		
		/*
			Method:
				drawCircle
			
			Draw circle at the center (or at a given point) of the sheet with a given radius
			
			Parameters:
				(number) radius - The radius of the circle
				(Vector, optional) pos - The position of the circle. Defaults to center
		*/
		
		drawCircle: function (radius, pos) {
			pos = pos || {x: 0, y: 0};
			
			this.ctx.save();
			this.ctx.translate(this.rect.size.width/2, this.rect.size.height/2);
			this.ctx.arc(0, 0, radius, 0, Math.PI*2, true);
			this.ctx.restore();
			this.ctx.fill();
		},
		
		/*
			Method:
				setFillColor
			Set the color used when filling with <fillPath>
		*/
		
		setFillColor: function (color) {
			this.ctx.fillStyle = color;
		},
		
		/*
			Method:
				setStrokeColor
			Set the border color for when using <strokePath>
		*/
		
		setStrokeColor: function (color) {
			this.ctx.strokeStyle = color;
		},
		
		/*
			Method:
				setLineWidth
			Set the line width of the border when using <strokePath>
		*/
		
		setLineWidth: function (width) {
			this.ctx.lineWidth = width;
		},
		
		/*
			Method:
				fillPath
			Fill the current path
		*/
		
		fillPath: function () {
			this.ctx.fill();
		},
		
		/*
			Method:
				strokePath
			Add a border around the current path
		*/
		
		strokePath: function () {
			this.ctx.stroke();
		},
		
		/*
			Method:
				clear
			Clear the sheet (canvas) to it's initial blank state
		*/
		
		clear: function () {
			this.ctx.clearRect(0, 0, this.rect.size.width, this.rect.size.height);
		},
		
		destroy: function ()  {
			// -- Bad style?
//			me.KickAss.unregisterElement(this.canvas);
			// --
			
			this.canvas.parentNode.removeChild(this.canvas);
		}
	});
	

  /****************** */
  socket = new io.Socket("127.0.0.1", { port: 808, rememberTransport: false });
  socket.on('connect', function () {
    // generate UID
    me.GUID = (function () {
      var id = "",
          i = 0;
      for (i; i < 4; i = i + 1) {
        id = id + ((((1+Math.random())*0x10000)|0).toString(16).substring(1));
      }
      return id;
    }());

    // tell the server our ID
    socket.send({ method: "connect", guid: me.GUID });
  });

  socket.on('message', function (obj) {
    var player = null;

    switch (obj.method) {
    case "server-full":
      alert(obj.message);
      break;

    case "connect":
      // set the proper ID for the client
      if (obj.guid === me.GUID) {
        me.GUID = obj.clientId;

        // start game
        if (!me.KickAss) {
          me.KickAss = new KickAss();
          me.KickAss.begin();

          if (me.hasOwnProperty("clients")) {
            for (player in me.clients) {
              if (me.clients.hasOwnProperty(player)) {
                me.KickAss.addEnemy(player);
              }
            }

            delete me.clients;
          }
        }
      }

      if (obj.hasOwnProperty("clients")) {
        me.clients = obj.clients;
      }
      break;

    // update position of player
    case "position":
      // if it's not you...
      if (obj.clientId !== me.GUID) {
        if (me.KickAss.enemies.hasOwnProperty(obj.clientId)) {
          var player = me.KickAss.enemies[obj.clientId];

          // TODO need to put this in a nice easy to read obj...
          player.pos.x = obj.pos.x;
          player.pos.y = obj.pos.y;
          player.currentRotation = obj.currentRotation;
          player.thrustersActive = obj.thrustersActive;
          player.fire = obj.fire;
        }
      }
      break;

    // someone died!
    case "kill":
    // TODO - fix security issues

      // oh noes I died :(
      if (obj.guid === me.GUID) {
        var player = me.KickAss.player;
        if (player) {
          me.KickAss.explosionManager.addExplosion(player.pos);
          player.destroy();
          delete me.KickAss.player;

          me.respawn = {
            count: 5,
            timer: null,
            div: document.createElement('div')
          };

          me.respawn.timer = window.setInterval(function () {
            var div = me.respawn.div;

            if (!me.respawn.count) {
              me.KickAss.addPlayer();

              socket.send({
                guid: me.GUID,
                method: "respawn"
              });

              document.getElementById('game').removeChild(div);

              window.clearInterval(me.respawn.timer);

            } else if (me.respawn.count === 5) {
              div.style.color = '#d0d0d0';
              div.style.fontSize = '300px';
              div.style.textAlign = 'center';
              div.style.fontFamily = "Arial";
              
              document.getElementById('game').appendChild(div);
            }

            div.innerHTML = me.respawn.count;

            me.respawn.count = me.respawn.count - 1;
          }, 1000);
        }
      } else {
        if (me.KickAss.enemies.hasOwnProperty(obj.guid)) {
          me.KickAss.enemies[obj.guid].destroy();
          delete me.KickAss.enemies[obj.guid];
        }
      }
      break;

    // someone's respawning
    case "respawn":
      if (obj.guid !== me.GUID) {
        me.KickAss.addEnemy(obj.guid);
      }
      break;

    // new player!
    case "player":
      // TODO need to work on initial rotation
      me.KickAss.addEnemy(obj.clientId);
    break;

    // someone quit...
    case "quit":
      if (me.KickAss.enemies.hasOwnProperty(obj.guid)) {
        me.KickAss.enemies[obj.guid].destroy();
        delete me.KickAss.enemies[obj.guid];
      }
      break;
    }

  });

  /** return a constructor to call to start a new game */
	return function () {
    // TODO verify game configs with the server
    /**
      - bullet time between fire
      - max velocity of players
      - velocity of bullets
      - colors
      */

    // connect to socket
    socket.connect();

    // if some time has passed and we're still not connected, offer a message
    setTimeout(function () {
      if (typeof(me.GUID) === "undefined") {
        alert("We seem to have issues connecting to the server, try again later?");
      }
    }, 20000);
  }

})(this);
