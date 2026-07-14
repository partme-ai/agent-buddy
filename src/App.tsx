import ConsoleAppComplete from './ConsoleAppComplete'
import InspectorDrawer from './InspectorDrawer'
import InstanceGovernanceDock from './InstanceGovernanceDock'
import OperationalControls from './OperationalControls'
import PaaSControlsDock from './PaaSControlsDock'
import ProtocolRegistrationDock from './ProtocolRegistrationDock'

export default function App() {
  return <>
    <ConsoleAppComplete />
    <OperationalControls />
    <InstanceGovernanceDock />
    <PaaSControlsDock />
    <ProtocolRegistrationDock />
    <InspectorDrawer />
  </>
}
