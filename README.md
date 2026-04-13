HELLO SIR!

To prove I didn't only use AI to do this, I shall explain what I have done to achieve maximum marks 💪

Exercise 1:
1) We setup a Hardhat project with Solidity
2) Wrote the vending machine Solidarity code, with all the features that were required.
3) Wrote the 10 tests in JS, covering most of the functions of a vending machine (I still think we need more to really make sure we are chilling)
4) Built a simple frontend to display the vending machine, the purchase history, as well as a seperate admin panel.
5) Created a script to deploy the contract and add 3 products into the 'vending machine'.

On-chain vs off-chain design decisions:

Decided to put the product catalog, purchase history, access control and balances ON CHAIN, this was because all of these are ledger-based, and we can utilize teh power of ETH contracts to solve these issues. I decided to put product images and detailed descriptions (that are not valuable to anyone) off-chain as well as the UI state and user-experience, which can essentially just be plug-and-played. This made the most sense to me because we don't want to waste GAS money on storing non-critical information that we don't really care if anyone finds.

Exercise 2:
1) Used Hardhat with the same ARM issue workaround.
2) Built a simple Express.js server with an SQL db
3) Added API endpoints to access data
4) Added 3 users and a couple events, and added a few pages to navigate

5) Wrote EventTickets.sol, with pretty much the same structure as SQL.
6) Wrote 10 tests for it, more formulated for ticket events rather than vending machine
7) Rebuilt the same UI as web2 but connected it via MetaMask instead of the API calls.

Web2 vs Web3 approach:
Obviously, in Web2, all the critical information lives in the database, whereas the non-critical (UI, product information, etc.), can be stored on the webpage. In Web3, the smart contract is the source of truth, there isn't a central database that can be modified or altered. The trust is placed in the code, not on the server. 


Problems I faced:
- My ARM64 laptop struggled to use Hardhat as the binary wasn't the same, so had to create a little shimmy through node and installed x64 version of Node.


See implementation/exercise-1/test-results.txt and implementation/exercise-2/test-results.txt for the results.