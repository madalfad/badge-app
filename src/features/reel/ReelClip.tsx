import { StyleSheet, View } from 'react-native';

export function ReelClip() {
  return (
    <View pointerEvents="none" style={styles.wrapper}>
      <View style={styles.reelAnchor}>
        <View style={styles.reelOuter}>
          <View style={styles.reelInner} />
        </View>
        <View style={styles.cord} />
        <View style={styles.clip}>
          <View style={styles.clipSlot} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 6,
    left: 0,
    right: 0,
    zIndex: 50,
    alignItems: 'center',
  },
  reelAnchor: {
    alignItems: 'center',
  },
  reelOuter: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#D7DEE8',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF99',
    shadowColor: '#000000',
    shadowOpacity: 0.3,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  reelInner: {
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: '#7B8797',
    borderWidth: 4,
    borderColor: '#F8FAFC',
  },
  cord: {
    width: 4,
    height: 50,
    marginTop: -2,
    borderRadius: 2,
    backgroundColor: '#BAC4D2',
  },
  clip: {
    width: 76,
    height: 22,
    marginTop: -3,
    borderRadius: 11,
    backgroundColor: '#E7ECF3',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFFB3',
  },
  clipSlot: {
    width: 40,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#94A3B8',
  },
});
