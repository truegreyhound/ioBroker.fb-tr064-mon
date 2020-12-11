// This file extends the AdapterConfig type from "@types/iobroker"


// Augment the globally declared type ioBroker.AdapterConfig
declare global {
	namespace ioBroker {
		// tslint-disable-next-line:no-empty-interface
		interface AdapterConfig extends _AdapterConfig {
			"fbIP": "",
			"fbPort": 49000,
			"fbUID": "",
			"fbPassword": "",
			"warningDestination": "",
			"devicesList": [],
			"devicesListOld": [],
			"devicesListIPChanged": false,
			"devicesListOwnerChanged": false,
			"devicesListWarnChanged": false,
			"devicesListWatchChanged": false,
			"ignoreSpeed": false
		}
	}
}

// this is required so the above AdapterConfig is found by TypeScript / type checking
export {};