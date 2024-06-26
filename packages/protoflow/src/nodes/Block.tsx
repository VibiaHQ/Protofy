import React, { useContext } from 'react';
import { connectItem, dumpConnection, getId, PORT_TYPES, DumpType, createNode } from '../lib/Node';
import Node, { FlowPort, headerSize } from '../Node';
import { useEdges } from 'reactflow';
import { FlowStoreContext } from "../store/FlowsStore";
import { NODE_TREE } from '../toggles';
import { DataOutput } from '../lib/types';
import useTheme, { usePrimaryColor } from '../diagram/Theme';
import { ListOrdered, Square, ArrowDownUp } from 'lucide-react';
import { generateBoxShadow } from '../lib/shadow';
import { useThemeSetting } from '@tamagui/next-theme'
import { useProtoflow } from '../store/DiagramStore';
import { Button } from '@my/ui';

const blockOffset = 200
const _marginTop = 222
const minBlockHeight = 120
const singleNodeOffset = 100
const alignBlockWithChildrens = true
const _borderWidth = 5


const Block = (node) => {
    const { id, type } = node
    const useFlowsStore = useContext(FlowStoreContext)
    const primaryColor = usePrimaryColor()
    const nodeData = useFlowsStore(state => state.nodeData[id] ?? {})
    const metaData = useFlowsStore(state => state.nodeData[id] && state.nodeData[id]['_metadata'] ? state.nodeData[id]['_metadata'] : { childWidth: 0, childHeight: 0, childHeights: [] })
    const setNodeData = useFlowsStore(state => state.setNodeData)
    const currentPath = useFlowsStore(state => state.currentPath)

    const nodeFontSize = useTheme('nodeFontSize')
    const nodeBackgroundColor = useTheme('nodeBackgroundColor')

    const { resolvedTheme } = useThemeSetting()
    const { setEdges, getEdges } = useProtoflow()


    const isEmpty = !metaData.childHeight
    const marginTop = _marginTop + (useTheme('nodeFontSize') / 2)
    //console.log('metadata in', node.id, metaData)
    const getBlockHeight = () => {
        if(!metaData.childHeight) return minBlockHeight
        return (metaData.childHeight+(marginTop*1.5)) + ((Math.max(0, nodeData.connections?.length - 1)) * 1)
    }

    const height = id ? getBlockHeight() : 0
    const edges = useEdges();

    const addConnection = () => {
        setNodeData(id, {
            ...nodeData,
            connections: nodeData.connections ? nodeData.connections.concat([1]) : [1]
        })
    }

    const onSwitchConnection = (index) => {
        const prevIndex = index - 1
        const prevBlock = 'block' + prevIndex
        const currBlock = 'block' + index

        const switchEdge = (targetHandle: string) => {
            if (targetHandle.endsWith(prevBlock)) return targetHandle.replace(prevBlock, currBlock)
            else if (targetHandle.endsWith(currBlock)) return targetHandle.replace(currBlock, prevBlock)
            else return targetHandle
        }

        setEdges(edgs => edgs.map(e => ({ ...e, targetHandle: e.target == id ? switchEdge(e.targetHandle) : e.targetHandle })))
    }

    let extraStyle: any = {}
    extraStyle.minHeight = height + 'px'
    extraStyle.border = 0
    extraStyle.minWidth = type == 'CaseClause' || type == 'DefaultClause' ? '400px' : '200px'

    const containerColor = useTheme('containerColor')
    const typeConf = {
        SourceFile: {
            // icon: Box,
            output: false,
            color: primaryColor,
            title: currentPath.split(/[/\\]/).pop()
        },
        Block: {
            icon: ListOrdered,
            color: resolvedTheme == 'dark' ? primaryColor :  '#cccccc88',
            title: 'Block'
        },
        CaseClause: {
            icon: Square,
            color: '#cccccc88',
            title: 'Case Clause'
        },
        DefaultClause: {
            icon: Square,
            color: '#cccccc88',
            title: 'Case Clause'
        }
    }
    const connectedEdges = id ? edges.filter(e => e.target == id) : []

    if (id) {
        React.useEffect(() => {
            if (nodeData.mode != 'json' && (connectedEdges.length == nodeData?.connections?.length || !nodeData?.connections?.length)) {
                addConnection()
            } else {
                //remove connections
                const lastConnected = connectedEdges.reduce((last, current) => {
                    const x = parseInt(current.targetHandle.slice(id.length+6), 10)
                    return x > last ? x : last
                }, -1)

                // console.log(id, 'prev: ', nodeData?.connections, 'edges: ', connectedEdges, lastConnected, 'should be: ', lastConnected)
                setNodeData(id, {
                    ...nodeData,
                    connections: nodeData.connections.slice(0, lastConnected+2)
                })
            }

        }, [edges, nodeData?.connections?.length])
    }


    const lineColor = "#00000025"
    return (
        <Node
            draggable={type != 'SourceFile'}
            // contentStyle={{borderLeft:borderWidth+'px solid '+borderColor}}
            container={!isEmpty}
            style={extraStyle}
            icon={typeConf[type].icon??null}
            node={node}
            output={typeConf[type]['output'] == false ? null : { field: 'value', type: 'output' }}
            isPreview={!id}
            title={typeConf[type].title}
            id={id}
            params={[]}
            color={typeConf[type].color}
            dataOutput={DataOutput.block}>
            {isEmpty?<div style={{height:nodeFontSize*2+'px'}}></div>:<>
                <div style={{
                    top: nodeFontSize*1.90,
                    opacity: 1,
                    pointerEvents: 'none',
                    borderRadius: "0px "+nodeFontSize/1.3+"px "+nodeFontSize/1.3+ "px "+ nodeFontSize/1.3+'px',position:'absolute', 
                    width: metaData.childWidth+(metaData.childWidth > 700 ? 100 : 0)+'px', 
                    height: height-headerSize-(nodeFontSize*2)+'px', 
                    backgroundColor: containerColor,
                    borderLeft: nodeFontSize/2+'px solid '+typeConf[type].color,
                    boxShadow: generateBoxShadow(1.5)
                }}></div>
            </>}
            <div>
                {/* {nodeData.connections?.map((ele, i) => <FlowPort id={id} type='input' label='' style={{ top: 60 + (i * 60) + 'px' }} handleId={'block' + i} />)} */}
                {nodeData.connections?.map((ele, i) => {
                    let pos = i && metaData && metaData && metaData.childHeight && metaData.childHeights && metaData.childHeights[i-1]? metaData.childHeights[i-1].height : 0
                    pos = pos + (nodeData.connections.length == 1 ? singleNodeOffset : marginTop)-10
                    //pos = 60 + (i * 60)
                    const isSwitchVisible = i < nodeData.connections.length - 1 && i > 0
                    const previousPos = i - 2 >= 0 ? (metaData.childHeights[i - 2]?.height + marginTop - 10) : (singleNodeOffset * 2)
                    const switchPos = (pos + previousPos) / 2

                    return <>
                        {connectedEdges.length > 0 && <div style={{ left: (nodeFontSize / 2 - 1) + 'px', position: 'absolute', top: (pos - (nodeFontSize / 4)) + 'px', width: nodeFontSize + 'px', height: (nodeFontSize / 2) + 'px', backgroundColor: typeConf[type].color }} />}
                        <FlowPort key={i} id={id} type='input' label='' style={{ left: isEmpty ? '' : (nodeFontSize) + 'px', top: pos + 'px' }} handleId={'block' + i} allowedTypes={["data", "flow"]} />
                        {isSwitchVisible ? <Button
                            onPress={() => onSwitchConnection(i)}
                            top={switchPos - 16}
                            position='absolute'
                            backgroundColor={nodeBackgroundColor}
                            hoverStyle={{
                                borderColor: typeConf[type].color,
                            }}
                            left={-16}
                            borderWidth={4}
                            borderColor={typeConf[type].color}
                            scaleIcon={1.5}
                            padding={"$2"}
                            icon={<ArrowDownUp color={typeConf[type].color} />}
                        /> : null}
                    </>
                })}
            </div>

            
            {/* <div style={{position:'absolute', width: metaData.childWidth+'px', height: borderWidth+'px', backgroundColor: borderColor}}></div>
            <div style={{top: height-borderWidth+'px', position:'absolute', width: metaData.childWidth+'px', height: borderWidth+'px', backgroundColor: borderColor}}></div>
            <div style={{top: headerSize-(borderWidth*2)+'px', position:'absolute', left: metaData.childWidth+'px', height: height-headerSize+(borderWidth*2)+'px', width: borderWidth+'px', backgroundColor: borderColor}}></div> */}
        </Node>
    );
}

Block.keywords = ["block", "{}", "CaseClause", 'group']
Block.category = "common"
Block.defaultHandle = PORT_TYPES.flow + 'block0'
Block.getData = (node, data, nodesData, edges, mode) => {
    //connect all children in a line
    const statements = node.getStatements ? node.getStatements() : node.getDeclarations()
    statements.forEach((statement, i) => {
        const item = data[getId(statement)]
        if (!item?.type) console.error('item has no type: ', item)
        if (item?.type == 'node') {
            const targetId = item.value.id
            if (targetId) {
                connectItem(targetId, 'output', node, 'block' + i, data, nodesData, edges, null, [PORT_TYPES.data, PORT_TYPES.flow])
            }
        }
    })

    const connections = node.getStatements()
    return { connections: mode == 'json' && connections.length ? connections : connections.concat([1]), mode: mode }
}
Block.dataOutput = DataOutput.block

Block.dump = (node, nodes, edges, nodesData, metadata = null, enableMarkers = false, dumpType: DumpType = "partial", level=0, trivia='') => {
    const data = nodesData[node.id] ?? { connections: [] };
    const connections = data.connections ?? []
    const astNode = data._astNode
    var originalText: string;
    if (astNode) {
        originalText = astNode.getText()
    }
    const spacing = node.type == 'Block' ? "\t" : ""

    let body = connections.map((statement, i) => {
        const valueEdge = edges.find(e => e.targetHandle == node.id + PORT_TYPES.flow + "block" + i && e.source)
        var prefix = ''
        //  if(valueEdge) {
        //     const valueNode = nodes.find(n => n.id == valueEdge.source)
            
            //  if(valueNode) {
            //      const childAstNode = nodesData[valueNode.id]._astNode
            //      if(childAstNode) {
        //             const childFullText = childAstNode.getFullText()
        //             console.log('childFullText: ', childFullText)
        //             const pos = originalText.indexOf(childFullText)
        //             console.log('childFullText pos: ', pos)
        //             if(pos) {
        //                 prefix = originalText.substring(0, pos)
        //             }
        //             console.log('childFullText prev originalText: ', originalText)
        //             originalText = originalText.substring(pos + childFullText.length)
        //             console.log('childFullText post originalText: ', originalText)
            //      }
            //  }
        // }
        const triviaInfo = {}
        let line = dumpConnection(node, "target", "block" + i, PORT_TYPES.flow, '', edges, nodes, nodesData, metadata, enableMarkers, dumpType, level+1, triviaInfo)
        //console.log('line is: ', line, 'and trivia is: [', triviaInfo['content']+']')
        prefix = triviaInfo['content'] && triviaInfo['content'].includes("\n") || !i ? '' : "\n"+(line?spacing.repeat(level>0?level:0):'')
        line = line ? prefix + line : null
        return {code: line, trivia: triviaInfo['content'] ?? ''}
    }).filter(l => l.code)


    const blockStartSeparator = body.length && body[0].trivia.includes("\n") ? "" : "\n"
    const value = (node.type == 'Block' ? "{"+blockStartSeparator : '') + body.map(b => b.code + ";").join("") + (node.type == 'Block' ? "\n"+spacing.repeat(Math.max(level-1, 0))+"}" : '')
    return value
}

// Block.onCreate = (nodeData, edges, nodeStore) => {
//     //const myEdges = edges.filter(edge => edge.target == nodeData.id)

//     return [nodeData].concat(nodeStore?.connections?.filter(c => !isNaN(c)).reduce((total, current, i) => {
//         const phantomId = 'Phantom_'+generateId()
//         connectItem(phantomId, 'output', nodeData.id, 'block'+i, {}, edges, null, [PORT_TYPES.data, PORT_TYPES.flow])
//         return total.concat(createNode([0, 0], 'PhantomBox', phantomId, null, false, edges, {}))
//     },[]))
// }

Block.filterChildren = (node, childNodeList, edges, nodeDataTable, setNodeData) => {
    if (!NODE_TREE) return childNodeList
    //if(!childNodeList.length || !childNodeList[0].id.startsWith('SourceFile_')) return childNodeList
    const vContainer = createNode([0, 0], "VisualGroup", 'VisualGroup_' + childNodeList[0].id, { visible: false }, false, edges)
    vContainer[0].children = childNodeList

    return vContainer;
}

Block.getWidth = (node) => {
    return 50
}

Block.getPosition = (pos, type) => {
    if(alignBlockWithChildrens) pos.y = pos.y + blockOffset
    return pos
}

Block.getSpacingFactor = () => {
    return {factorX: 1.2, factorY: 1}
}

export default Block
