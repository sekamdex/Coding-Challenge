import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import * as utils from '../utils';

class BalanceOutput extends Component {
  render() {
    if (!this.props.userInput.format) {
      return null;
    }

    return (
      <div className='output'>
        <p>
          Total Debit: {this.props.totalDebit} Total Credit: {this.props.totalCredit}
          <br />
          Balance from account {this.props.userInput.startAccount || '*'}
          {' '}
          to {this.props.userInput.endAccount || '*'}
          {' '}
          from period {utils.dateToString(this.props.userInput.startPeriod)}
          {' '}
          to {utils.dateToString(this.props.userInput.endPeriod)}
        </p>
        {this.props.userInput.format === 'CSV' ? (
          <pre>{utils.toCSV(this.props.balance)}</pre>
        ) : null}
        {this.props.userInput.format === 'HTML' ? (
          <table className="table">
            <thead>
              <tr>
                <th>ACCOUNT</th>
                <th>DESCRIPTION</th>
                <th>DEBIT</th>
                <th>CREDIT</th>
                <th>BALANCE</th>
              </tr>
            </thead>
            <tbody>
              {this.props.balance.map((entry, i) => (
                <tr key={i}>
                  <th scope="row">{entry.ACCOUNT}</th>
                  <td>{entry.DESCRIPTION}</td>
                  <td>{entry.DEBIT}</td>
                  <td>{entry.CREDIT}</td>
                  <td>{entry.BALANCE}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>
    );
  }
}

BalanceOutput.propTypes = {
  balance: PropTypes.arrayOf(
    PropTypes.shape({
      ACCOUNT: PropTypes.number.isRequired,
      DESCRIPTION: PropTypes.string.isRequired,
      DEBIT: PropTypes.number.isRequired,
      CREDIT: PropTypes.number.isRequired,
      BALANCE: PropTypes.number.isRequired
    })
  ).isRequired,
  totalCredit: PropTypes.number.isRequired,
  totalDebit: PropTypes.number.isRequired,
  userInput: PropTypes.shape({
    startAccount: PropTypes.number,
    endAccount: PropTypes.number,
    startPeriod: PropTypes.date,
    endPeriod: PropTypes.date,
    format: PropTypes.string
  }).isRequired
};

export default connect(state => {
  let balance = [];

  let wildcardAccount = (pos) => {
    let reducer = (prev, curr) => {
      let condition = prev.ACCOUNT < curr.ACCOUNT;
      if (pos === 'last') condition = prev.ACCOUNT > curr.ACCOUNT;  
      return condition ? prev : curr
    };

    return (state.accounts.length > 0) ? state.accounts.reduce(reducer).ACCOUNT : null;
  };

  let wildcardPeriod = (pos) => {
    let reducer = (prev, curr) => {
      let condition = new Date(prev.PERIOD) < new Date(curr.PERIOD);
      if (pos === 'last') condition = new Date(prev.PERIOD) > new Date(curr.PERIOD);  
      return condition ? prev : curr;
    };
    
    return (state.journalEntries.length > 0) ? state.journalEntries.reduce(reducer).PERIOD : null;
  };

  const startPeriod = new Date(new Date(state.userInput.startPeriod).getMonth() ? state.userInput.startPeriod : wildcardPeriod());
  const endPeriod = new Date(new Date(state.userInput.endPeriod).getMonth() ? state.userInput.endPeriod : wildcardPeriod('last'));

  const startAccount = (state.userInput.startAccount) ? state.userInput.startAccount : wildcardAccount();
  const endAccount = (state.userInput.endAccount) ? state.userInput.endAccount : wildcardAccount('last');

  let byRange = (entry) => {
    const period = new Date(entry.PERIOD);
    const inPeriodRange = period >= startPeriod && period <= endPeriod;
    const inAccountRange = entry.ACCOUNT >= startAccount && entry.ACCOUNT <= endAccount;

    return (inPeriodRange && inAccountRange);
  };

  let balanceSet = (entry) => {
    const acc = state.accounts.find(item => item.ACCOUNT === entry.ACCOUNT);
    
    return {
      ACCOUNT: entry.ACCOUNT,
      DESCRIPTION: (acc) ? acc.LABEL : '',
      DEBIT: entry.DEBIT,
      CREDIT: entry.CREDIT,
      BALANCE: entry.DEBIT - entry.CREDIT
    };
  };

  balance = state.journalEntries.filter(byRange).map(balanceSet);

  const totalCredit = balance.reduce((acc, entry) => acc + entry.CREDIT, 0);
  const totalDebit = balance.reduce((acc, entry) => acc + entry.DEBIT, 0);

  return {
    balance,
    totalCredit,
    totalDebit,
    userInput: state.userInput
  };
})(BalanceOutput);
