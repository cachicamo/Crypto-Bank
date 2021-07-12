import React, { Component } from 'react';
import { Tabs, Tab } from 'react-bootstrap'
import Web3 from 'web3';

import dBank from '../abis/dBank.json'
import Token from '../abis/Token.json'
import dbanklogo from '../dbank.png';
import './App.css';


class App extends Component {
  
  constructor(props) {
    super(props)
    this.state = {
      web3: 'undefined',
      account: '',
      token: null,
      dbank: null,
      balance: 0,
      depositDate: 0,
      dBankAddress: null,
      tokenBalance: 0,
      invested: 0,
      collateral: 0,
      interest: 0
    }

    this.convert = this.convert.bind(this)
    this.interestearned = this.interestearned.bind(this)
    this.updatevalues = this.updatevalues.bind(this)
  }

  async componentWillMount() {
    await this.loadBlockchainData(this.props.dispatch)
  }


  convert = (value) => {
    return Web3.utils.fromWei(value)
  }

  interestearned = () => {
    let depositTime = 0
    let interestPerSec, interest
    if(this.state.depositDate > 0) {
      depositTime = (parseInt(Date.now()/1000)) - this.state.depositDate
      interestPerSec = 31668017 * (this.state.invested / 1e16);
      //calc accrued interest
      interest = interestPerSec * depositTime;
      // console.log( interest )
      this.setState({ interest: interest })
    }
  }

  fee = () => {
    let depositTime = 0
    let interestPerSec, interest
    if(this.state.depositDate > 0) {
      depositTime = (parseInt(Date.now()/1000)) - this.state.depositDate
      interestPerSec = 31668017 * (this.state.invested / 1e16);
      //calc accrued interest
      interest = interestPerSec * depositTime;
      // console.log( interest )
      this.setState({ interest: interest })
    }
  }

  async updatevalues() {
    const balance = await this.state.web3.eth.getBalance(this.state.account);
    const tokenBalance = await this.state.token.methods.balanceOf(this.state.account).call()
    const depositDate =  await this.state.dbank.methods.depositStart(this.state.account).call()
    const invested = await this.state.dbank.methods.etherBalanceOf(this.state.account).call()
    const collateral = await this.state.dbank.methods.collateralEther(this.state.account).call()
    this.interestearned()
    this.setState({ balance: balance, tokenBalance: tokenBalance, invested: invested, depositDate: depositDate, collateral: collateral})
  }

  async loadBlockchainData(dispatch) {
    //check if MetaMask exists
    if(typeof window.ethereum !== 'undefined'){
      //assign values to variables: web3, netId, accounts
      const web3 = new Web3(window.ethereum)
      const netId = await web3.eth.net.getId()
      const accounts = await web3.eth.getAccounts()
  
      //check if account is detected, then load balance&setStates, else push alert
      if(typeof accounts[0] !== 'undefined'){
        const balance = await web3.eth.getBalance(accounts[0]);
        this.setState({ account: accounts[0], balance: balance, web3: web3})
      } else {
        window.alert('Please login with MetaMask')
        throw('Please login with MetaMask')
      }
      
      //in try block load contracts
      try {
        const token = new web3.eth.Contract(Token.abi, Token.networks[netId].address)
        const dbank = new web3.eth.Contract(dBank.abi, dBank.networks[netId].address)
        const dBankAddress = dBank.networks[netId].address
        this.setState({ token: token, dbank: dbank, dBankAddress: dBankAddress })
      } catch (error) {
        // Contracts do not exist push alert
        console.log('Error', error)
        window.alert(`Contracts not deployed to the current network ${netId}`)
        throw('Please login with MetaMask')
      }
      
      // save token balance for account
      const tokenBalance = await this.state.token.methods.balanceOf(this.state.account).call()
      const depositDate =  await this.state.dbank.methods.depositStart(this.state.account).call()
      const invested = await this.state.dbank.methods.etherBalanceOf(this.state.account).call()
      const collateral = await this.state.dbank.methods.collateralEther(this.state.account).call()
      this.setState({ tokenBalance: tokenBalance, invested: invested, depositDate: depositDate, collateral: collateral})

      this.interestearned()

    } else {
      window.alert('Please install MetaMask')
    }
  }

  async deposit(amount) {
    //check if this.state.dbank is ok
    if(this.state.dbank !== 'undefined'){
      //in try block call dBank deposit();
      try {
        await this.state.dbank.methods.deposit().send({ value: amount.toString(), from: this.state.account })
        this.updatevalues()

      } catch (error) {
        console.log('Error, deposit: ', error)
      }
    }
    // document.querySelector("form").reset();
  }

  async withdraw(e) {
    //prevent button from default click
    e.preventDefault()
    //check if this.state.dbank is ok
    if(this.state.dbank !== 'undefined'){
      //in try block call dBank withdraw();
      try {
        await this.state.dbank.methods.withdraw().send({ from: this.state.account })
        this.setState({ interest: 0})
        this.updatevalues()

      } catch (error) {
        console.log('Error, deposit: ', error)
      }
    }
  }

  async borrow(amount) {
    if(this.state.dbank!=='undefined'){
      try{
        await this.state.dbank.methods.borrow().send({value: amount.toString(), from: this.state.account})
        this.updatevalues()

      } catch (e) {
        console.log('Error, borrow: ', e)
      }
    }
  }

  async payOff(e) {
    e.preventDefault()
    if(this.state.dbank!=='undefined'){
      try{
        const collateralEther = await this.state.dbank.methods.collateralEther(this.state.account).call({from: this.state.account})
        const tokenBorrowed = collateralEther/2
        await this.state.token.methods.approve(this.state.dBankAddress, tokenBorrowed.toString()).send({from: this.state.account})
        await this.state.dbank.methods.payOff().send({from: this.state.account})
        this.updatevalues()

      } catch(e) {
        console.log('Error, pay off: ', e)
      }
    }
  }


  render() {
    return (
      <div className='text-monospace'>
        <nav className="navbar navbar-dark fixed-top bg-dark flex-md-nowrap p-0 shadow">
          <a
            className="navbar-brand col-sm-3 col-md-2 mr-0"
            href="https://www.jpaisys.com"
            target="_blank"
            rel="noopener noreferrer"
          >
        <img src={dbanklogo} className="App-logo" alt="logo" height="32"/>
          <b>dBank</b>
        </a>
        </nav>
        <div className="container-fluid mt-5 text-center">
        <br></br>
          <h1>Welcome to dBank</h1>
          <h2>{this.state.account.substr(0,6)}...{this.state.account.substr(38,40)}</h2>
          <br></br>
          <div className="row">
            <main role="main" className="col-lg-12 d-flex text-center">
              <div className="content mr-auto ml-auto">
              <Tabs defaultActiveKey="profile" id="uncontrolled-tab-example">
                <Tab eventKey="deposit" title="Deposit">
                { (this.state.invested == 0) ? (
                  <div>
                    <br />
                    How much do you want to deposit?
                    <br />
                    (min. amount is 0.01 ETH)
                    <br />
                    <form onSubmit={(e) => {
                      e.preventDefault()
                      let amount = this.depositAmount.value
                      amount = amount * 10**18 // conver to Wei
                      this.deposit(amount)
                    }}>
                      <div className='form-group mr-sm-2'>
                        <br />
                        <input
                          id='depositAmount'
                          step="0.01"
                          type='number'
                          min="0.01"
                          className="form-control form-control-md"
                          placeholder="amount..."
                          required
                          ref={(input) => { this.depositAmount = input }}
                        />
                      </div>
                      { this.state.account.length > 0 ? (
                        <button type="submit" className="btn btn-primary">DEPOSIT</button>
                      ): null}
                    </form>
                  </div> ) : (
                    <div>
                    <br />
                          You Already have an Active Deposit of { this.convert(this.state.invested.toString()) } ETH 
                        <br />
                    </div>
                  )}
                </Tab>

                <Tab eventKey="withdraw" title="Withdraw">
                    
                    { (this.state.invested != 0) ? (
                      <div>
                        <br />
                          Do you want to withdraw {this.convert(this.state.invested.toString()) } ETH  / {this.convert(this.state.interest.toString())} DBC interest?
                        <br />
                        <br />
                        <div>
                          <button type="submit" className="btn btn-primary" onClick={(e) => this.withdraw(e)}>WITHDRAW</button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <br />
                          You Do not have a Deposit in the dBank... 
                        <br />
                        <br />
                      </div>
                    ) }
                </Tab>

                <Tab eventKey="borrow" title="Borrow">
                  {this.state.collateral == 0 ? (
                    <div>
                      <br></br>
                        Do you want to borrow tokens?
                        <br></br>
                        (You'll get 50% of collateral, in Tokens)
                        <br></br>
                        Type collateral amount (in ETH)
                        <br></br>
                        <br></br>
                        <form onSubmit={(e) => {

                          e.preventDefault()
                          let amount = this.borrowAmount.value
                          amount = amount * 10 **18 //convert to wei
                          this.borrow(amount)
                          }}>
                          <div className='form-group mr-sm-2'>
                            <input
                              id='borrowAmount'
                              step="0.01"
                              min="0.01"
                              type='number'
                              ref={(input) => { this.borrowAmount = input }}
                              className="form-control form-control-md"
                              placeholder='amount...'
                              required />
                          </div>
                          { this.state.account.length > 0 ? (
                            <button type='submit' className='btn btn-primary'>BORROW</button>
                          ): null}
                        </form>
                    </div>
                  ) : (
                    <div>
                    <br />
                          You Already have an Active Loan of { (this.convert((this.state.collateral.toString()))/2)} DBC 
                        <br />
                    </div>
                  )}
                </Tab>

                <Tab eventKey="payOff" title="Payoff">
                {this.state.collateral > 0 ? (
                  <div>
                  <br></br>
                    Do you want to payoff the loan?
                    <br></br>
                    (You'll receive your collateral - fee)
                    <br></br>
                    <br></br>
                    <button type='submit' className='btn btn-primary' onClick={(e) => this.payOff(e)}>PAYOFF</button>
                  </div>
                ) :(
                  <div>
                    <br />
                          You do not have an Active Loan, get one now on Borrow Tab..
                        <br />
                    </div>
                )}
                </Tab>

                <Tab eventKey="balance" title="Balance">
                    <br />
                    Current Account Balance
                    <br />
                    <br />
                    <div className='form-group mr-sm-2'>
                      <p>ETH : { this.convert(this.state.balance.toString()) } </p>
                      <p>DBC : { this.convert(this.state.tokenBalance.toString()) }</p><br />
                      <p>Invested ETH : { this.convert(this.state.invested.toString()) }</p>
                      {this.state.invested > 0 ? (
                        <p>Current Interest earned: {this.convert(this.state.interest.toString())}</p>
                        ) : (null)}
                      <p>Collateral in ETH : { this.convert(this.state.collateral.toString()) }</p>
                      <p>Loan in DBC : { (this.convert(this.state.collateral.toString()))/2 }</p>
                      {this.state.collateral > 0 ? (
                        <p>Loan fee in ETH : {this.convert(this.state.collateral.toString()) * 0.10}</p>
                        ) : (null)}
                      { this.state.account.length > 0 ? (
                        <button type="submit" className='btn btn-primary' onClick={(e) => this.updatevalues()}>Update</button>
                      ): null}
                    </div>
                </Tab>
                
              </Tabs>
              </div>
            </main>
          </div>
        </div>
      </div>
    );
  }
}

export default App;