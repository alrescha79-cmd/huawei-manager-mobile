import { StyleSheet } from 'react-native';

export const homeStyles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    reLoginButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    reLoginButtonLarge: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 8,
        marginTop: 12,
        alignItems: 'center',
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    signalContainer: {
        marginLeft: 16,
    },
    trafficSection: {
        backgroundColor: 'rgba(0,0,0,0.02)',
        borderRadius: 8,
        padding: 12,
    },
    trafficHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    trafficRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    trafficItem: {
        flex: 1,
        alignItems: 'center',
    },
    dataUsageGrid: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    dataUsageItem: {
        flex: 1,
        alignItems: 'center',
    },
    totalUsageContainer: {
        alignItems: 'center',
        marginTop: 16,
    },
    controlRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 8,
    },
    controlButton: {
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    quickActionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
    },
    quickActionGrid: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderRadius: 12,
        minHeight: 70,
    },
    infoRowCustom: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    quickActionsRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 8,
    },
    quickActionLarge: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 12,
    },
    quickActionSmall: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 6,
        borderRadius: 12,
        minHeight: 60,
    },
    quickActionIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    quickActionLargeContent: {
        flex: 1,
        minWidth: 0,
    },
    connectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    networkTypeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 2,
        borderRadius: 4,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    ispContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(128, 128, 128, 0.2)',
    },
    connectionGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    connectionGridItem: {
        width: '48%',
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderRadius: 10,
    },
    connectionGridIcon: {
        marginRight: 8,
    },
    connectionGridContent: {
        flex: 1,
        minWidth: 0,
    },
    connectionMainRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    signalIconContainer: {
        marginRight: 12,
    },
    connectionInfoContainer: {
        flex: 1,
        minWidth: 0,
    },
    connectionStatusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginLeft: 8,
    },
    connectionStatusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    connectionInfoRows: {
        gap: 8,
    },
    connectionInfoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    connectionLeftSection: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    connectionSignalLabels: {
        marginLeft: 12,
        flex: 1,
    },
    connectionRightSection: {
        alignItems: 'flex-end',
    },
    connectionInfoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 0,
    },
    connectionInfoGridItem: {
        width: '50%',
        paddingVertical: 8,
        paddingRight: 8,
    },
});
