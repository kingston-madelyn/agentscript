import util from '../src/util.js'
import Model3D from '../src/Model3D.js'

export default class Wander3DModel extends Model3D {
    static defaultOptions() {
        return {
            population: 25,
            speed: 0.1, // patches per step
            wiggle: 0.5, // radians, more than the usual 0.1, too chaotic!
            rotateEvery: 15,
        }
    }

    // ======================

    constructor(worldDptions) {
        super(worldDptions) // default world options if "undefined"
        Object.assign(this, Wander3DModel.defaultOptions())
    }
    setup() {
        this.turtles.setDefault('atEdge', 'bounce')

        this.turtles.create(this.population, t => {
            t.setxyz(...this.world.random3DPoint())
        })
    }

    step() {
        const doRotations = this.ticks % this.rotateEvery === 0
        this.turtles.ask(t => {
            if (doRotations) {
                t.right(util.randomCentered(this.wiggle))
                t.tiltUp(util.randomCentered(this.wiggle))
                t.rollRight(util.randomCentered(this.wiggle))
            }
            t.forward(this.speed)
        })
    }
}
