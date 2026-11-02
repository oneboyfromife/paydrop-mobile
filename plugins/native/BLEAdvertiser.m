#import "BLEAdvertiser.h"

// PayDrop foreground advertiser. Scanning is owned by react-native-ble-plx.
@interface BLEAdvertiser ()
@property (nonatomic, copy) RCTPromiseResolveBlock pendingResolve;
@property (nonatomic, copy) RCTPromiseRejectBlock pendingReject;
@property (nonatomic, assign) NSUInteger startGeneration;
@end

@implementation BLEAdvertiser
RCT_EXPORT_MODULE(BLEAdvertiser)
+ (BOOL)requiresMainQueueSetup { return YES; }
- (dispatch_queue_t)methodQueue { return dispatch_get_main_queue(); }
- (NSArray<NSString *> *)supportedEvents { return @[]; }
- (NSDictionary *)constantsToExport { return @{ @"PAYDROP_CONFIRMED_START": @YES }; }

RCT_EXPORT_METHOD(setCompanyId:(nonnull NSNumber *)companyId) {
    if (!peripheralManager) {
        peripheralManager = [[CBPeripheralManager alloc] initWithDelegate:self queue:nil options:nil];
    }
}

- (void)rejectPending:(NSString *)message {
    RCTPromiseRejectBlock reject = self.pendingReject;
    self.pendingResolve = nil;
    self.pendingReject = nil;
    if (reject) reject(@"PAYDROP_ADVERTISE", message, nil);
}

RCT_EXPORT_METHOD(broadcast:(NSString *)uid payload:(NSArray *)payload options:(NSDictionary *)options
                  resolve:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
    if (!peripheralManager || peripheralManager.state != CBManagerStatePoweredOn) {
        reject(@"PAYDROP_BLUETOOTH", @"Bluetooth is not ready", nil);
        return;
    }
    [self rejectPending:@"Advertising replaced"];
    [peripheralManager stopAdvertising];
    self.pendingResolve = resolve;
    self.pendingReject = reject;
    NSUInteger generation = ++self.startGeneration;
    [peripheralManager startAdvertising:@{ CBAdvertisementDataServiceUUIDsKey: @[[CBUUID UUIDWithString:uid]] }];
    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, 5 * NSEC_PER_SEC), dispatch_get_main_queue(), ^{
        if (generation == self.startGeneration && self.pendingReject) {
            [peripheralManager stopAdvertising];
            [self rejectPending:@"Advertising startup timed out"];
        }
    });
}

- (void)peripheralManagerDidStartAdvertising:(CBPeripheralManager *)peripheral error:(NSError *)error {
    if (error) { [self rejectPending:@"Bluetooth advertising failed"]; return; }
    RCTPromiseResolveBlock resolve = self.pendingResolve;
    self.pendingResolve = nil;
    self.pendingReject = nil;
    if (resolve && peripheral.isAdvertising) resolve(@"Advertising");
}

RCT_EXPORT_METHOD(stopBroadcast:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
    ++self.startGeneration;
    [peripheralManager stopAdvertising];
    [self rejectPending:@"Advertising cancelled"];
    resolve(@"Stopped");
}

RCT_EXPORT_METHOD(getAdapterState:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
    resolve(peripheralManager && peripheralManager.state == CBManagerStatePoweredOn ? @"STATE_ON" : @"STATE_OFF");
}

- (void)peripheralManagerDidUpdateState:(CBPeripheralManager *)peripheral {
    if (peripheral.state != CBManagerStatePoweredOn) {
        [peripheral stopAdvertising];
        [self rejectPending:@"Bluetooth unavailable"];
    }
}

- (void)centralManagerDidUpdateState:(CBCentralManager *)central {}
@end
