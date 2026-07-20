// main.go — arranque del chaincode escrow-v1 (PRP-013, Fase 2).
package main

import (
	"log"

	"github.com/hyperledger/fabric-contract-api-go/v2/contractapi"

	// La plantilla vive en el mismo modulo; en el paquete generado por el
	// Engine este import apunta al chaincode parametrizado.
	chaincode "github.com/a2a/fabrica-sc/escrow-v1/chaincode"
)

func main() {
	cc, err := contractapi.NewChaincode(&chaincode.SmartContract{})
	if err != nil {
		log.Panicf("error creando el chaincode escrow-v1: %v", err)
	}
	if err := cc.Start(); err != nil {
		log.Panicf("error arrancando el chaincode escrow-v1: %v", err)
	}
}
