# Extendable DAO Demo

This repository demonstrates an Extendable DAO, allowing an eager community to build upon the DAO adding new functionality and activating it by voting. This is entirely for education and there's still things to harden before production use.

Please view the [Solution](https://developer.algorand.org/solutions/how-does-an-extendable-dao-work/) on the Algorand Developer Portal to find out more.

## Requirements 

* Algorand Sandbox
* npm

## Getting Started

To setup sandbox for the first time, do the following:

```sh
./sandbox up dev -v
```

To launch the UI, run the following commands from the root directory.

```sh
npm install
npm run start
```

## Steps

0. Deploy DAO
1. Create DAO Token
2. Initiate DAO using DAO Token
3. Develop New Functionality
4. Deploy and Propose Functionality
5. Vote for or against Proposed Functionality
6. Activate/Deactivate Proposed Functionality
7. Invoke Functionality

