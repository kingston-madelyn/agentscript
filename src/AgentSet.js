import AgentArray from './AgentArray.js'

/**
 * Subclass of AgentArray, used for Model Patches, Turtles, Links & Breeds.
 *
 * AgentSets are AgentArrays that are factories for their own Agents.
 *
 * Thus the Turtles AgentSet is a factory for class Turtle instances
 * using the create() or addAgent() factory methods.
 *
 * AgentSets are not created directly by modelers, only other
 * AgentSet subclasses: Patches, Turtles, Links & Breeds.
 * @class
 */
class AgentSet extends AgentArray {
    /**
     * Magic to return AgentArrays rather than AgentSets
     * [Symbol.species](https://goo.gl/Zsxwxd)
     *
     * @readonly
     * @static
     * @memberof AgentSet
     */
    static get [Symbol.species]() {
        return AgentArray
    }

    // Create an empty `AgentSet` and initialize the `ID` counter for add().
    // If baseSet is supplied, the new agentset is a subarray of baseSet.
    // This sub-array feature is how breeds are managed, see class `Model`
    /**
     * @param {Object} model Instance of Class {@link ./Model.js} to which I belong
     * @param {Class} AgentClass Class of items stored in this AgentSet
     * @param {String} name Name of this AgentSet. Ex: Patches
     * @param {AgentSet} [baseSet=null] If a Breed, it's parent AgentSet
     * @memberof AgentSet
     */
    constructor(model, AgentClass, name, baseSet = null) {
        super() // create empty AgentArray
        baseSet = baseSet || this // if not a breed, set baseSet to this
        Object.assign(this, { model, name, baseSet, AgentClass })
        // BaseSets know their breeds and keep the ID global
        if (this.isBaseSet()) {
            this.breeds = {} // will contain breedname: breed entries
            this.ID = 0
            // Breeds inherit frm their baseSet and add themselves to baseSet
        } else {
            Object.setPrototypeOf(this, Object.getPrototypeOf(baseSet))
            this.baseSet.breeds[name] = this
        }
        // Keep a list of this set's variables; see `own` below
        // REMIND: not really used. Remove? Create after setup()?
        this.ownVariables = []
        // Create a proto for our agents by having a defaults and instance layer
        // this.AgentClass = AgentClass
        this.agentProto = new AgentClass(this)
        this.protoMixin(this.agentProto, AgentClass)
        // }
    }
    // All agents have:
    // vars: id, agentSet, model, world, breed (getter)
    //   baseSet by name: turtles/patches/links
    // methods: setBreed, getBreed, isBreed
    // getter/setter: breed
    /**
     * Add common variables to an Agent being added to this AgentSet.
     *
     * Each Agent has it's AgentSet and the Model instance.
     * It also has an id, set by the AgentSet's global ID.
     *
     * The Agent also has three methods added: setBreed, getBreed, isBreed.
     *
     * @param {Object} agentProto A new instance of the Agent being added
     * @param {Class} AgentClass It's Class
     * @memberof AgentSet
     */
    protoMixin(agentProto, AgentClass) {
        Object.assign(agentProto, {
            agentSet: this,
            model: this.model,
            // world: this.world
        })
        agentProto[this.baseSet.name] = this.baseSet

        // if (this.isBaseSet()) {
        // Model.reset should not redefine these.
        if (!AgentClass.prototype.setBreed) {
            Object.assign(AgentClass.prototype, {
                setBreed(breed) {
                    breed.setBreed(this)
                },
                getBreed() {
                    return this.agentSet
                },
                isBreed(breed) {
                    return this.agentSet === breed
                },
            })
            Object.defineProperty(AgentClass.prototype, 'breed', {
                get: function () {
                    return this.agentSet
                },
            })
        }
    }

    /**
     * Create a subarray of this AgentSet.
     * Example: create a people breed of Turtles:
     *
     * `people = turtles.newBreed('people')`
     *
     * @param {String} name The name of the new breed AgentSet
     * @return {AgentSet} A subarray of me
     * @memberof AgentSet
     */
    newBreed(name) {
        return new AgentSet(this.model, this.AgentClass, name, this)
    }

    /**
     * @return {boolean} true if I am a baseSet subarray
     * @memberof AgentSet
     */
    isBreedSet() {
        return this.baseSet !== this
    }
    /**
     * @return {boolean} true if I am a Patches, Turtles or Links AgentSet
     * @memberof AgentSet
     */
    isBaseSet() {
        return this.baseSet === this
    }

    /**
     * Return breeds in a subset of an AgentSet
     *
     * Ex: patches.inRect(5).withBreed(houses)
     *
     * @param {AgentSet} breed A breed AgentSet
     * @return {AgentSet}
     * @memberof AgentSet
     */
    withBreed(breed) {
        return this.filter(a => a.agentSet === breed)
    }

    // Abstract method used by subclasses to create and add their instances.
    create() {
        console.log(`AgentSet: Abstract method called: ${this}`)
    }

    /**
     * @param {Object} o An Agent to be added to this AgentSet
     * @return {Object} The input Agent, bound to this AgentSet.
     * @memberof AgentSet
     * @description
     * Add an Agent to this AgentSet.  Only used by factory methods.
     * Adds the `id` property to Agent. Increment AgentSet `ID`.
     */
    addAgent(o) {
        // o only for breeds adding themselves to their baseSet
        o = o || Object.create(this.agentProto) // REMIND: Simplify! Too slick.
        if (this.isBreedSet()) {
            this.baseSet.addAgent(o)
        } else {
            o.id = this.ID++
            if (o.agentConstructor) o.agentConstructor()
        }
        this.push(o)
        return o
    }
    /**
     * Remove all Agents from this AgentSet using agent.die() for each agent.
     *
     * @memberof AgentSet
     */
    clear() {
        // die() is an agent method. sets it's id to -1
        while (!this.isEmpty()) this.last().die()
    }
    /**
     * Remove an Agent from this AgentSet
     *
     * @param {Object} o The Agent to be removed
     * @return {AgentSet} This AgentSet with the Agent removed
     * @memberof AgentSet
     */
    removeAgent(o) {
        // Note removeAgent(agent) different than remove(agent) which
        // simply removes the agent from it's array

        // Remove me from my baseSet
        if (this.isBreedSet()) this.baseSet.remove(o, 'id')
        // Remove me from my set.
        this.remove(o, 'id')
        return this
    }

    /**
     * Set a default value shared by all Agents in this AgentSet
     *
     * @param {String} name The name of the shared value
     * @param {any} value
     * @return {AgentSet} This AgentSet
     * @memberof AgentSet
     */
    setDefault(name, value) {
        this.agentProto[name] = value
        return this
    }
    /**
     * Return a default, shared value
     *
     * @param {String} name The name of the default
     * @return {any} The default value
     * @memberof AgentSet
     */
    getDefault(name) {
        return this.agentProto[name]
    }
    // Used when getter/setter's need to know if get/set default
    // settingDefault(agent) {
    //     return agent.id == null
    // }

    // Declare variables of an agent class. May deprecate if not needed.
    // `varnames` is a string of space separated names
    // own(varnames) {
    //     // if (this.isBreedSet())
    //     //   this.ownVariables = util.clone(this.baseSet.ownVariables)
    //     for (const name of varnames.split(' ')) {
    //         this.setDefault(name, null)
    //         this.ownVariables.push(name)
    //     }
    // }

    /**
     * Move an agent from its AgentSet/breed to be in this AgentSet/breed
     *
     * @param {Agent} a An agent, a member of another AgentSet
     * @return {Agent} The updated agent
     * @memberof AgentSet
     */
    setBreed(a) {
        // change agent a to be in this breed
        // Return if `a` is already of my breed
        if (a.agentSet === this) return
        // Remove/insert breeds (not baseSets) from their agentsets
        if (a.agentSet.isBreedSet()) a.agentSet.remove(a, 'id')
        if (this.isBreedSet()) this.insert(a, 'id')

        // Make list of `a`'s vars and my ownvars.
        const avars = a.agentSet.ownVariables
        // First remove `a`'s vars not in my ownVariables
        for (const avar of avars) {
            if (!this.ownVariables.includes(avar)) delete a[avar]
        }
        // Now add ownVariables to `a`'s vars, default to 0.
        // If ownvar already in avars, it is not modified.
        for (const ownvar of this.ownVariables) {
            if (!avars.includes(ownvar)) a[ownvar] = 0
        } // NOTE: NL uses 0, maybe we should use null?

        // Give `a` my defaults/statics
        return Object.setPrototypeOf(a, this.agentProto)
    }

    /**
     * Call fcn(agent, index, array) for each item in AgentArray.
     * Index & array optional. Overrides AgentArray's ask with
     * additional guards for modifications in AgentSet's array.
     *
     * @param {Function} fcn fcn(agent, index?, array?)
     * @memberof AgentSet
     */
    ask(fcn) {
        if (this.length === 0) return
        const lastID = this.last().id // would fail w/o 0 check above
        // for (let i = 0; this[i].id <= lastID; i++) { // nope.
        for (let i = 0; i < this.length && this[i].id <= lastID; i++) {
            fcn(this[i], i, this)
        }
    }

    /**
     * A much stronger version of ask(fcn) with stronger mutability guards.
     *
     * @param {Function} fcn fcn(agent, index?, array?)
     * @memberof AgentSet
     */
    askSet(fcn) {
        // Manages immutability reasonably well.
        if (this.length === 0) return
        // Patches are static
        if (this.name === 'patches') super.forLoop(fcn)
        else if (this.isBaseSet()) this.baseSetAsk(fcn)
        else if (this.isBreedSet()) this.cloneAsk(fcn)
    }

    // An ask function for mutable baseSets.
    // BaseSets can only add past the end of the array.
    // This allows us to manage mutations by allowing length change,
    // and managing deletions only within the original length.
    baseSetAsk(fcn) {
        if (this.length === 0) return
        const lastID = this.last().id

        // Added obj's have id > lastID. Just check for deletions.
        // There Be Dragons:
        // - AgentSet can become length 0 if all deleted
        // - For loop tricky:
        //   - i can become negative w/in loop:
        //   - i can become bigger than current AgentSet
        //   - Guard w/ i<len & i>=0
        for (let i = 0; i < this.length; i++) {
            const obj = this[i]
            const id = obj.id
            if (id > lastID) break
            fcn(obj, i, this)
            if (i >= this.length) break
            if (this[i].id > id) {
                while (i >= 0 && this[i].id > id) i-- // ok if -1
            }
        }
    }

    // For breeds, mutations can occur in many ways.
    // This solves this by cloning the initial array and
    // managing agents that have died or changed breed.
    // In other words, we can be concerned only with mutations
    // of the agents themselves.
    cloneAsk(fcn) {
        const clone = this.clone()
        for (let i = 0; i < clone.length; i++) {
            const obj = clone[i]
            // obj.id > 0: obj.die() sets id to -1
            if (obj.breed == this && obj.id > 0) {
                fcn(obj, i, clone)
            }
        }
    }
}

export default AgentSet
