// @ts-check
'use strict'

const size_cell = 10

let w = Math.floor(window.innerWidth / size_cell)
let h = Math.floor(window.innerHeight / size_cell)

let sW = w * size_cell
let sH = h * size_cell

let COLOR_AIR = [200,200,250]
let COLOR_SEMEN = [255,255,255]
let COLOR_SPROUT = [50, 200, 50]
let COLOR_WOOD = [150, 100, 100]
let COLOR_EARTH = COLOR_WOOD 
let COLOR_LEAF = [20, 220, 20]

let pg 
let live_list  
let field

let max_age = 100
let percent_air = 0.9
let percent_branch = 0.04
let max_height = 0.4
let max_stock = h * max_height
let dead_count = 0
let seed_percentage = 0.01
let number_of_starting_seeds = 3

// Функции которые возвращают клетку соседнюю клетку поля
function getTop(obj){return field[obj.x][(obj.y - 1 + h) % h]}
function getBottom(obj){return field[obj.x][(obj.y + 1) % h]}
function getLeft(obj){return field[(obj.x - 1 + w) % w][obj.y]}
function getRight(obj){return field[(obj.x + 1) % w][obj.y]}

function clamp(n, from, to){
  return Math.max(from, Math.min(n, to))
}

// Найти индекс элемента в списке когда список состоит из списков с двумя элементами
function find_index(list, item){
  for(let i = 0; i < list.length; i++){
    if (list[i][0] === item[0] && list[i][1] === item[1]){
      return i
    }
  }
  return -1
}

// Класс клеток поля
class Cell{
  constructor(x, y){
    this.x = x
    this.y = y
    this.bright = 1
    this.radius = 0
    this.tilt_probability = 0.4
    this.root = this
    this.tree_height = 0
    this.age = 0
    this.is_root = false
    this.set_dead = 0

    if (y > h * percent_air){
      this.become_earth()
    }
    else {
      this.become_air()
    }
  }
  
  become_earth(){
    this.type = 'earth'
    this.color = COLOR_EARTH
  }
        
  become_air(){
    this.type = 'air'
    this.color = COLOR_AIR
  }
        
  become_seed(){
    if (find_index(live_list, [this.x, this.y]) < 0) {
      live_list.push([this.x, this.y])
    }
    this.type = 'seed'
    this.color = COLOR_SEMEN
  }

  become_sprout(parrent){
    if (find_index(live_list, [this.x, this.y]) < 0) {
      live_list.push([this.x, this.y])
    }
    this.type = 'sprout'
    this.root = parrent.root
    this.radius = 1
    this.color = COLOR_SPROUT
  }

  become_wood(parrent){
    if (find_index(live_list, [this.x, this.y]) < 0) {
      live_list.push([this.x, this.y])
    }
    this.root = parrent.root
    this.type = 'wood'
    this.color =  COLOR_WOOD.map(x => Number(x * this.bright), COLOR_WOOD)
  }

  become_leaf(parrent){
    if (find_index(live_list, [this.x, this.y]) < 0) {
      live_list.push([this.x, this.y])
    }
    this.root = parrent.root
    this.type = 'leaf'
    this.color = COLOR_LEAF.map(x =>  Number(x * this.bright))
  }

  dead(){
    this.become_air()
    this.is_root = false
    this.bright = 1
    this.radius = 0
    this.tilt_probability = 0.4
    this.root = this
    this.tree_height = 0
    this.age = 0
 
    let ind = find_index(live_list, [this.x, this.y])
    if (ind >= 0){
      live_list.splice(ind, 1)
      dead_count ++
    }

      pg.fill(this.color)
      pg.rect(this.x*size_cell, this.y*size_cell, size_cell, size_cell);
    }
  

  do_like_seed(){
    let bottom = getBottom(this)
    if (bottom.type == 'air'){
      bottom.become_seed() 
      this.dead()

      pg.fill(bottom.color)
      pg.rect(bottom.x*size_cell, bottom.y*size_cell, size_cell, size_cell);
    } else if (bottom.type == 'earth'){
      this.is_root = true
      this.stock = max_stock
      this.tree_height = h-this.y
      this.become_sprout(this)
    }
  }

  do_like_sprout(){
    if (Math.random() + max_height < this.root.tree_height / h){
      this.become_leaf(this)
    } else {
      let r = Math.random()
      let neighbour
      if (r > this.tilt_probability){
        neighbour = getTop(this)
      } else if (r > this.tilt_probability*0.5){
        neighbour = getLeft(this)
      } else {
        neighbour = getRight(this)
      }
          
      if (neighbour.type == 'air'){
        neighbour.become_sprout(this)
        neighbour.bright = Math.max(0, Math.min(1, this.bright + 0.1*(Math.random()*2-1)))
        neighbour.root = this.root
        if (neighbour.root.tree_height < h - this.y){
          neighbour.root.stock += 10
          neighbour.root.tree_height = h - this.y
        }
        if (Math.random() > percent_branch){
          this.become_wood(this)
        }    
      }
    }
  }


  do_like_wood(){
    let толщина_земли = Number((1-percent_air)*h)
    let tree_height = this.root.tree_height-толщина_земли
    let cell_height = h-this.y-толщина_земли 
 
    if (tree_height - cell_height > this.radius*15){
      let neighbour
      let r = Math.random()
      if (r > 0.5){neighbour = getRight(this)}
      else {neighbour = getLeft(this)}
   
      if (neighbour.type == 'air'){
        neighbour.bright = Math.max(0, this.bright * 0.7)
        neighbour.become_wood(this)
        neighbour.root = this.root
        neighbour.radius = this.radius + 1
      }   
    }
  }


  do_like_leaf(){
    if (this.root.stock > 0){
      let r = Math.random()
      let neighbour
      if (r > 0.75) {neighbour = getTop(this)}
      else if (r > 0.5) {neighbour = getLeft(this)}
      else if (r > 0.25) {neighbour = getRight(this)}
      else {neighbour = getBottom(this)}
          
      if (neighbour.type == 'air'){
        let r = Math.random()
        if (r < seed_percentage) {
          neighbour.become_seed()
        } else {
          neighbour.root = this.root
        neighbour.bright = Math.max(0, Math.min(1, this.bright + Math.random()*0.2-0.1))
        neighbour.become_leaf(this)
        this.root.stock -= 1
        }
      }    
    }
  }
}



function restart(){

  pg = createGraphics(sW, sH, P2D)
  pg.background(255)
  pg.noStroke()

  // Создание клеточного поля
  live_list = []
  field = []
  for (let x = 0; x < Math.floor(sW / size_cell); x++){
    let temp = []
    for (let y = 0; y < Math.floor(sH / size_cell); y++){
      let i = new Cell(x,y)
      temp.push(i)
    }
    field.push(temp)
  }

  // Засеивание стартовых семян
  let start_seed = number_of_starting_seeds
  for (let i = 0; i < start_seed; i++){
    let x = Math.floor(Math.random() * w)
    let y = Math.floor(Math.random() * h)
    if (field[x][y].type == 'air'){
      field[x][y].become_seed()
    } else {
      start_seed++
    }
  }

  // Отрисовка всех клеток
  for (let x = 0; x < field.length; x++){
    for (let y = 0; y < field[0].length; y++){
      let i = field[x][y]
      pg.fill(i.color)
      pg.rect(x*size_cell, y*size_cell, size_cell, size_cell);
    }
  }
}

function setup() {
  createCanvas(windowWidth, windowHeight)
  frameRate(60)
  pixelDensity(1)
  noStroke()
  restart()
}




function draw() {
  dead_count = 0

  // Для каждой живой клетки
  let lenght_live_list = live_list.length
  for (let i = 0; i < lenght_live_list; i++){
    let x = live_list[i-dead_count][0]
    let y = live_list[i-dead_count][1]
    let item = field[x][y]

    if (item.root.set_dead > 0){
      if (item.is_root === false){
        item.dead()
      }
    } else {
      if (item.type == 'seed'){
        item.do_like_seed()
      } else if (item.type == 'sprout'){
        item.do_like_sprout()
      } else if (item.type == 'wood'){
        item.do_like_wood()
      } else if (item.type == 'leaf'){
        item.do_like_leaf()
      }
    }

    if (item.is_root === true) {
      item.age++
      if (item.age > max_age) {
        item.set_dead++
        if (item.set_dead > 2){ // > 2 же
          item.dead()
          item.set_dead = 0
        }
      }
    } 

    pg.fill(item.color)
    pg.rect(item.x*size_cell, item.y*size_cell, size_cell, size_cell); 
  }

  image(pg, 0, 0, pg.width, pg.height)
}

function windowResized() {
  w = Math.floor(window.innerWidth / size_cell)
  h = Math.floor(window.innerHeight / size_cell)

  sW = w * size_cell
  sH = h * size_cell

  resizeCanvas(sW, sH)

  restart()
}

window.onclick = function onclick() {
  restart()
}