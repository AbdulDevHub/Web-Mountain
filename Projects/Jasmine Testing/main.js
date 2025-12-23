/* Unit Testing: Additional Matchers Challenge
*
* 1. Look through the docs and write a test for a matcher we haven't discussed yet
* - https://jasmine.github.io/api/edge/matchers
* - https://jasmine.github.io/api/edge/matchers
*/

// Test Suite 
describe(`${User.name} Class`, () => {
    let model;
    
    beforeEach(() => {
        model = new User();
    });

    describe('additional matchers testing area', () => {
        it('has my first name', () => {
            // arrange
            const firstName = 'Dylan';
            const lastName = 'Israel';
            
            // act
            model = new User({firstName, lastName});
            
            // assert
            expect(model.fullName).toMatch(/Dylan/);
        });
    });
});