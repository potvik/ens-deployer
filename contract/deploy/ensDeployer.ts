import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { ethers } from 'hardhat'

const ORACLE_PRICE_NATIVE_ASSET_NANO_USD = process.env.ORACLE_PRICE_NATIVE_ASSET_NANO_USD || '100000000000'
const ORACLE_PRICE_BASE_UNIT_PRICE = process.env.ORACLE_PRICE_BASE_UNIT_PRICE || '32'
const ORACLE_PRICE_PREMIUM = JSON.parse(process.env.ORACLE_PRICE_PREMIUM || '{}')

console.log({ ORACLE_PRICE_NATIVE_ASSET_NANO_USD, ORACLE_PRICE_BASE_UNIT_PRICE, ORACLE_PRICE_PREMIUM })

const func = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments: { deploy }, getNamedAccounts } = hre
  const { deployer } = await getNamedAccounts()
  const TLD = process.env.TLD || 'country'
  const OracleDeployer = await deploy('OracleDeployer', {
    from: deployer,
    args: [
      ORACLE_PRICE_NATIVE_ASSET_NANO_USD,
      ORACLE_PRICE_BASE_UNIT_PRICE,
      Object.keys(ORACLE_PRICE_PREMIUM),
      Object.values(ORACLE_PRICE_PREMIUM)
    ]
  })
  const oracleDeployer = await ethers.getContractAt('OracleDeployer', OracleDeployer.address)
  const priceOracle = await oracleDeployer.oracle()
  const usdOracle = await oracleDeployer.usdOracle()
  console.log('oracleDeployer:', oracleDeployer.address)
  console.log('- priceOracle:', priceOracle)
  console.log('- usdOracle:', usdOracle)
  const ENSUtils = await deploy('ENSUtils', { from: deployer })
  const ENSRegistryDeployer = await deploy('ENSRegistryDeployer', { from: deployer, libraries: { ENSUtils: ENSUtils.address } })
  const ENSNFTDeployer = await deploy('ENSNFTDeployer', { from: deployer, libraries: { ENSUtils: ENSUtils.address } })
  const ENSControllerDeployer = await deploy('ENSControllerDeployer', { from: deployer, libraries: { ENSUtils: ENSUtils.address } })
  const ENSPublicResolverDeployer = await deploy('ENSPublicResolverDeployer', { from: deployer, libraries: { ENSUtils: ENSUtils.address } })
  const ENSDeployer = await deploy('ENSDeployer', {
    from: deployer,
    args: [TLD, priceOracle],
    log: true,
    // autoMine: true,
    libraries: {
      ENSUtils: ENSUtils.address,
      ENSRegistryDeployer: ENSRegistryDeployer.address,
      ENSNFTDeployer: ENSNFTDeployer.address,
      ENSControllerDeployer: ENSControllerDeployer.address,
      ENSPublicResolverDeployer: ENSPublicResolverDeployer.address
    }
  })
  const ensDeployer = await ethers.getContractAt('ENSDeployer', ENSDeployer.address)
  console.log('deployer account', deployer)
  console.log('ENSDeployer deployed to:', ensDeployer.address)
  console.log('- ens deployed to:', await ensDeployer.ens())
  console.log('- fifsRegistrar deployed to:', await ensDeployer.fifsRegistrar())
  console.log('- reverseRegistrar deployed to:', await ensDeployer.reverseRegistrar())
  console.log('- baseRegistrar deployed to:', await ensDeployer.baseRegistrar())

  console.log('- metadataService deployed to:', await ensDeployer.metadataService())
  console.log('- nameWrapper deployed to:', await ensDeployer.nameWrapper())

  console.log('- registrarController deployed to:', await ensDeployer.registrarController())

  console.log('- publicResolver deployed to:', await ensDeployer.publicResolver())

  console.log('- universalResolver deployed to:', await ensDeployer.universalResolver())

  const receipt = await ensDeployer.transferOwner(deployer).then(tx => tx.wait())
  console.log('tx', receipt.transactionHash)
  const ens = await ethers.getContractAt('ENSRegistry', await ensDeployer.ens())
  console.log('ens owner:', await ens.owner(new Uint8Array(32)))
  const resolverNode = ethers.utils.keccak256(ethers.utils.concat([new Uint8Array(32), ethers.utils.keccak256(ethers.utils.toUtf8Bytes('resolver'))]))
  const reverseRegNode = ethers.utils.keccak256(ethers.utils.concat([new Uint8Array(32), ethers.utils.keccak256(ethers.utils.toUtf8Bytes('reverse'))]))
  console.log('resolver node owner:', await ens.owner(resolverNode))
  console.log('reverse registrar node owner:', await ens.owner(reverseRegNode))

  const Multicall = await deploy('Multicall3', { from: deployer })
  const addresses = {
    priceOracle,
    usdOracle: await oracleDeployer.usdOracle(),
    OracleDeployer: oracleDeployer.address,
    ENSDeployer: ENSDeployer.address,
    ENSRegistry: await ens.address,
    BaseRegistrarImplementation: await ensDeployer.baseRegistrar(),
    FIFSRegistrar: await ensDeployer.fifsRegistrar(),
    ReverseRegistrar: await ensDeployer.reverseRegistrar(),
    MetadataService: await ensDeployer.metadataService(),
    NameWrapper: await ensDeployer.nameWrapper(),
    ETHRegistrarController: await ensDeployer.registrarController(),
    PublicResolver: await ensDeployer.publicResolver(),
    UniversalResolver: await ensDeployer.universalResolver(),
    Multicall: await Multicall.address
  }
  console.log(JSON.stringify(addresses))
  return addresses
}
func.tags = ['ENSDeployer']
export default func
