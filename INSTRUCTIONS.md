Smart Contracts and DApp Development
Smart contracts, on chain state, off chain logic, and application design     

In class, we discussed smart contracts, blockchain state, transactions, wallets, contract functions, events, gas costs, and the difference between logic that should live on chain and logic that should stay off chain. We also discussed that a decentralized application is not only a smart contract, but a full application made up of smart contracts, a frontend, and often a database.

In this assignment, you will work on Ethereum compatible smart contracts and build small applications that help you understand how a decentralized application is designed and implemented. The focus of the assignment is not only to make the application work, but also to make clear design choices about what should go on chain, what should stay off chain, and why.

The goal of this assignment is to help you get a feel for developing a real dApp. You will deploy smart contracts, connect them to a frontend, send transactions from a wallet, read on chain state, and reason about the trade offs of your design.

Expected submissions
Your solutions should follow the same structure as Assignment 1 and Assignment 2. Put your source code in an implementation/ folder so I can review it and provide feedback.

Put the smart contract, client app (GUI) code and tests in:

·       implementation/exercise-1/contracts/

·       implementation/exercise-1/app/

·       implementation/ exercise-1/tests/



·       implementation/exercise-2/contracts/

·       implementation/exercise-2/app/

·       implementation/ exercise-2/tests/

For each exercise, also include a short README.md file that explains:

·       How you tested the project, what were your test cases

·       the main design choices, especially what is on chain and what is off chain

Rules and constraints
Use the Ethereum development environment we saw in class: Ganache, Hardhat and python web3. As example refer to my simple public GitHub repo: https://github.com/milangroshev/harthat-web3-tutorial/blob/main/README.md

If you are already familiar with other set of Ethereum development environment, fell free to use it.

You may use Solidity libraries and frontend libraries, but you must understand the role of each major component you use and be able to explain your choices.

You may use AI tools and LLMs to help you, but you are responsible for the final design and implementation. If I see code that works but whose design choices are weak or inconsistent, you will lose points.

Keep your smart contracts small and clear. Prefer readable design over unnecessary complexity. Think carefully about what information should be stored on chain. On chain storage is expensive, public, and permanent. For each exercise, document your design choices. I am interested in why you modeled the contract the way you did, not only in whether the code runs. Try to understand the security implications of your design. Think about access control, payments, replay of actions, invalid state transitions, and abuse by malicious users.

Minimum contract quality requirements
For all smart contract exercises, your contracts must satisfy the following minimum requirements:

Validate important inputs and reject invalid actions
Use clear error handling with require(...), revert(...), or custom errors where appropriate
Emit events for important state changes
Include at least one restricted function for admin only actions where relevant
Keep the contract design simple and avoid unnecessary storage or unnecessary features
Document the purpose of each public function with short comments
Think carefully about who is allowed to call each function and when
Exercise 1. Build a vending machine dApp
In this exercise you will design and implement a vending machine application as a web3 app. The application should simulate a digital vending machine that sells different items. A user connects a wallet, sees the available items, buys one or more items, and becomes the owner of the purchased items inside the application.

Your solution must include:

1.        A Solidity smart contract(s) that models the vending machine

2.        A python client (or frontend GUI ) that interacts with the contract through a wallet.

3.        The vending machine smart contract should have several items for sale.

4.        A way to track which user owns which purchased items.

5.        A way to show the current stock and item availability.

Minimum technical requirements for Exercise 1
Your vending machine solution must include at least the following features:

1.        At least three different products

2.        A price for each product

3.        A stock quantity for each product

4.        A purchase function that allows a user to buy one or more items

5.        Validation for insufficient payment

6.        Validation for out of stock items

7.        Ownership tracking so that purchased items can be linked to the buyer

8.        At least two events, one for purchases and one for restocking or product updates

9.        A frontend or client that clearly shows product information, current stock, ownership, and transaction status

Testing requirements for Exercise 1
In this exercise we will also learn how to test the smart contract. In hardhat in the test folder you can put your test script (e.g., test.ts), write the test cases and then run them using npx hardhat test.  Testing is a required part of the submission.

You must include at least five tests for the smart contract logic. Your tests must include:

1.        at least one successful purchase

2.        at least one failed purchase due to insufficient payment

3.        at least one failed purchase due to unavailable stock

4.        at least one permission failure, for example a non admin user trying to restock

5.        at least one test that checks state changes after a successful transaction

You may write more tests if you want. Good tests should not only show that the contract works in one happy path case, but also show what happens when users make mistakes or try invalid actions.

Source code to submit
Put the code in:

·       implementation/exercise-1/contracts/

·       implementation/exercise-1/app/

·       implementation/exercise-1/test/

For this exercise, also include a short README.md file in the implementation folder that explains:

·      How you tested the project, what were your test cases

·      the main design choices, especially what is on chain and what is off chain

Important constraint
Do not copy an existing ERC 20 token sale tutorial and rename it as a vending machine. This exercise is about contract modeling and dapp design. Your client app or GUI must do more than call one purchase function. It should clearly present item information, stock, prices, ownership, and transaction status.

 

Exercise 2. Build a web2 version and a web3 version of the same app

In this exercise you will implement the same application twice, once as a normal web2 app and once as a web3 app.

The goal is to understand what belongs on chain, what should remain off chain, and what changes when trust is handled by a smart contract instead of a centralized backend.

Proposed app: Event ticket booking and resale
You will build an application where users can browse events, buy tickets, and transfer or resell them.

Part A, web2 version

Implement a web2 version of the application. You may use any backend and frontend stack you want. Scalability for your app is also not important just show the main functionality.

The web2 app must support at least:

·       event creation by an admin

·       ticket purchase by users

·       ticket ownership tracking

·       transfer or resale of tickets

Part B, web3 version

Implement a decentralized version of the same app. You can re-use the same front-end from the web2 app and use web3 to connect the frontend to the smart contracts.

Minimum technical requirements for Exercise 2
Your solution for Exercise 2 must implement the same core ticketing application in both a web2 version and a web3 version.

The web2 version must include at least:

creation of at least two events
at least two different users who can buy tickets
ticket ownership tracking
ticket transfer or resale functionality
at least one admin only action, such as event creation or ticket release
persistent storage of users, events, and ticket ownership
a simple interface or terminal client that allows a user to view events, buy tickets, and view owned tickets
The web3 version must include at least:

1.        Solidity smart contract for ticket management

2.        creation of at least two events or ticketed offerings

3.        ticket purchase functionality through blockchain transactions

4.        ticket ownership functionality

5.        ticket transfer functionality