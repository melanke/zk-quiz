pragma solidity ^0.8.19;

import "./DeployHelpers.s.sol";
import "../contracts/AnswerVerifier.sol";
import "../contracts/Quiz.sol";

contract DeployQuizAndAnswerVerifier is ScaffoldETHDeploy {
    function run() external ScaffoldEthDeployerRunner {
        new Quiz(address(new AnswerVerifier()));
    }
}
