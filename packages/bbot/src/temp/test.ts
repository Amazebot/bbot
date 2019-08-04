abstract class Animal {
  constructor (public name: string) {}
  abstract feed (food: any): void
  abstract pat (): void
}

class Dog extends Animal {
  fed = false
  feed = (food?: string) => (food)
    ? this.fed = true
    : console.log('🐶')
  pat = () => console.log('❤️')
  walk = () => console.log('🐕')
}

class Cat extends Animal {
  likes = ['salmon', 'tuna']
  feed = (food: string = '') => (this.likes.includes(food))
    ? console.log('😻')
    : console.log('😾')
  pat = () => console.log('❤️')
  sleep = () => console.log('💤')
}

type Pets = {
  dog?: Dog
  cat?: Cat
}

class Owner {
  pets: Pets = {}
  buy (type: keyof Pets, animal: Cat | Dog) {
    this.pets[type] = animal
    /**
     * 🚫
     * Type 'Dog | Cat' is not assignable to type '(Dog & Cat) | undefined'.
     * Type 'Dog' is not assignable to type 'Dog & Cat'.
     * Property 'likes' is missing in type 'Dog' but required in type 'Cat'.
     */
  }
  patPets () {
    for (let pet of this.pets) {
      /**
       * 🚫Type 'Pets' must have a '[Symbol.iterator]()' method that returns an
       * iterator.
       */
      if (pet) pet.pat()
    }
  }
}

const owner = new Owner()

// How do I accept and store animals in their correct slot?

owner.buy('dog', new Dog('roger'))
owner.buy('cat', new Cat('honey'))

owner.pets.cat.feed('salmon') /* 🚫 object (cat) is possibly undefined */

// For my real world scenario, Dog and Cat could also be extended and instances
// of any child classes should be accepted into their parent class' slot.
